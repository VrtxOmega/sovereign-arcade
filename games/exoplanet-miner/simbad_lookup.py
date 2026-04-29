"""
SIMBAD TAP Enrichment Module
Queries SIMBAD's TAP service for stellar metadata given RA/DEC coordinates.
Returns spectral type, object classification, parallax, distance, proper motion,
and nearby known objects (confirmed planets, eclipsing binaries, etc.)
"""

import requests
import math

SIMBAD_TAP = "https://simbad.u-strasbg.fr/simbad/sim-tap/sync"

def query_simbad(ra, dec, radius_arcsec=30):
    """
    Cone search around RA/DEC via SIMBAD TAP ADQL.
    Returns list of nearby objects with stellar metadata.
    """
    radius_deg = radius_arcsec / 3600.0
    
    adql = f"""
    SELECT TOP 15
        basic.main_id,
        basic.otype_txt AS object_type,
        basic.sp_type AS spectral_type,
        basic.plx_value AS parallax_mas,
        basic.plx_err AS parallax_err,
        basic.rvz_radvel AS radial_velocity,
        basic.ra AS ra,
        basic.dec AS dec,
        DISTANCE(
            POINT('ICRS', basic.ra, basic.dec),
            POINT('ICRS', {ra}, {dec})
        ) * 3600 AS separation_arcsec
    FROM basic
    WHERE CONTAINS(
        POINT('ICRS', basic.ra, basic.dec),
        CIRCLE('ICRS', {ra}, {dec}, {radius_deg})
    ) = 1
    ORDER BY separation_arcsec ASC
    """
    
    try:
        resp = requests.get(SIMBAD_TAP, params={
            "request": "doQuery",
            "lang": "adql",
            "format": "json",
            "query": adql
        }, timeout=15)
        
        if resp.status_code != 200:
            return {"error": f"SIMBAD returned HTTP {resp.status_code}", "objects": []}
        
        data = resp.json()
        columns = [col["name"] for col in data.get("metadata", [])]
        rows = data.get("data", [])
        
        objects = []
        for row in rows:
            obj = dict(zip(columns, row))
            # Compute distance in parsecs from parallax
            if obj.get("parallax_mas") and obj["parallax_mas"] > 0:
                obj["distance_pc"] = round(1000.0 / obj["parallax_mas"], 1)
            else:
                obj["distance_pc"] = None
            obj["separation_arcsec"] = round(obj.get("separation_arcsec", 0), 2)
            objects.append(obj)
        
        return {"objects": objects, "error": None}
        
    except requests.Timeout:
        return {"error": "SIMBAD query timed out (15s)", "objects": []}
    except Exception as e:
        return {"error": f"SIMBAD query failed: {str(e)}", "objects": []}


def enrich_candidate(ra, dec):
    """
    Full SIMBAD enrichment for a candidate at RA/DEC.
    Returns a structured dict with:
      - primary: the closest match (likely the host star)
      - spectral_type, object_type, distance, parallax
      - neighbors: known objects within 3 arcmin
      - known_planets_nearby: any confirmed planets in the field
      - flags: rotating variable, eclipsing binary, etc.
    """
    result = query_simbad(ra, dec, radius_arcsec=180)  # 3 arcmin
    
    enrichment = {
        "primary_id": None,
        "spectral_type": None,
        "object_type": None,
        "distance_pc": None,
        "parallax_mas": None,
        "radial_velocity_kms": None,
        "separation_arcsec": None,
        "neighbor_count": 0,
        "known_planets_nearby": [],
        "eclipsing_binaries_nearby": [],
        "flags": [],
        "simbad_raw": [],
        "error": result.get("error")
    }
    
    objects = result.get("objects", [])
    enrichment["neighbor_count"] = len(objects)
    enrichment["simbad_raw"] = objects
    
    if not objects:
        return enrichment
    
    # Primary = closest match (< 10 arcsec)
    primary = objects[0]
    if primary.get("separation_arcsec", 999) < 10:
        enrichment["primary_id"] = primary.get("main_id", "").strip()
        enrichment["spectral_type"] = primary.get("spectral_type", "").strip() if primary.get("spectral_type") else None
        enrichment["object_type"] = primary.get("object_type", "").strip() if primary.get("object_type") else None
        enrichment["distance_pc"] = primary.get("distance_pc")
        enrichment["parallax_mas"] = primary.get("parallax_mas")
        enrichment["radial_velocity_kms"] = primary.get("radial_velocity")
        enrichment["separation_arcsec"] = primary.get("separation_arcsec")
        
        # Flag classifications
        otype = (enrichment["object_type"] or "").lower()
        if "rotat" in otype or "ro*" in otype:
            enrichment["flags"].append("ROTATING_VARIABLE")
        if "eclips" in otype or "eb*" in otype or "ecl" in otype:
            enrichment["flags"].append("ECLIPSING_BINARY")
        if "planet" in otype or "pl" == otype:
            enrichment["flags"].append("KNOWN_PLANET")
        
        sptype = (enrichment["spectral_type"] or "")
        if "IV" in sptype:
            enrichment["flags"].append("SUBGIANT")
        if "III" in sptype and "IV" not in sptype:
            enrichment["flags"].append("GIANT")
    
    # Scan neighbors for planets and binaries
    for obj in objects[1:]:
        otype = (obj.get("object_type", "") or "").lower()
        name = (obj.get("main_id", "") or "").strip()
        sep = obj.get("separation_arcsec", 0)
        
        if "planet" in otype or "pl" == otype:
            enrichment["known_planets_nearby"].append({
                "name": name,
                "separation_arcsec": sep,
                "type": obj.get("object_type", "")
            })
        if "eclips" in otype or "eb*" in otype:
            enrichment["eclipsing_binaries_nearby"].append({
                "name": name,
                "separation_arcsec": sep
            })
    
    if enrichment["known_planets_nearby"]:
        enrichment["flags"].append("KNOWN_PLANETS_IN_FIELD")
    
    return enrichment


def format_for_oracle(enrichment):
    """
    Format SIMBAD enrichment as text to inject into the oracle prompt.
    """
    if enrichment.get("error") and not enrichment.get("primary_id"):
        return "SIMBAD STELLAR CONTEXT: Lookup failed or no match within 10 arcsec."
    
    lines = ["SIMBAD STELLAR CONTEXT:"]
    
    if enrichment.get("primary_id"):
        lines.append(f"- Host Star ID: {enrichment['primary_id']} (offset: {enrichment.get('separation_arcsec', '?')} arcsec)")
    
    if enrichment.get("spectral_type"):
        lines.append(f"- Spectral Type: {enrichment['spectral_type']}")
    
    if enrichment.get("object_type"):
        lines.append(f"- Object Classification: {enrichment['object_type']}")
    
    if enrichment.get("distance_pc"):
        lines.append(f"- Distance: {enrichment['distance_pc']} pc (parallax: {enrichment.get('parallax_mas', '?')} mas)")
    
    if enrichment.get("radial_velocity_kms") is not None:
        lines.append(f"- Radial Velocity: {enrichment['radial_velocity_kms']} km/s")
    
    if enrichment.get("flags"):
        lines.append(f"- Flags: {', '.join(enrichment['flags'])}")
    
    if enrichment.get("known_planets_nearby"):
        planets = [f"{p['name']} ({p['separation_arcsec']:.0f}\")" for p in enrichment["known_planets_nearby"]]
        lines.append(f"- Known Planets in Field: {', '.join(planets)}")
    
    if enrichment.get("eclipsing_binaries_nearby"):
        ebs = [f"{e['name']} ({e['separation_arcsec']:.0f}\")" for e in enrichment["eclipsing_binaries_nearby"]]
        lines.append(f"- Eclipsing Binaries in Field: {', '.join(ebs)}")
    
    lines.append(f"- Total SIMBAD Objects within 3 arcmin: {enrichment.get('neighbor_count', 0)}")
    
    # Add interpretation guidance
    if "ROTATING_VARIABLE" in enrichment.get("flags", []):
        lines.append("- WARNING: Host classified as rotating variable. Periodic dimming may be starspot modulation, not transit.")
    if "ECLIPSING_BINARY" in enrichment.get("flags", []):
        lines.append("- WARNING: Host classified as eclipsing binary. Transit signal is likely stellar eclipse, not planetary.")
    if "SUBGIANT" in enrichment.get("flags", []):
        lines.append("- NOTE: Subgiant host (larger radius). Scale companion radius estimate accordingly (R_star ~1.5-2.5 R_sun).")
    
    return "\n".join(lines)


if __name__ == "__main__":
    # Test with KIC 9141881 coordinates
    print("Testing SIMBAD enrichment for KIC 9141881...")
    enrichment = enrich_candidate(285.619, 45.569)
    print(format_for_oracle(enrichment))
    print(f"\nFlags: {enrichment['flags']}")
    print(f"Neighbors: {enrichment['neighbor_count']}")
