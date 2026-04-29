"""
Known Exoplanet Registry — Downloads and caches the confirmed planet host
list from the NASA Exoplanet Archive TAP service. Used as an exclusion
filter so the miner only evaluates stars WITHOUT confirmed planets.
"""
import os
import json
import time
import requests
import re

CACHE_FILE = os.path.join(os.path.dirname(__file__), "known_hosts_cache.json")
CACHE_MAX_AGE_S = 86400  # Re-download once per day

NASA_TAP_URL = (
    "https://exoplanetarchive.ipac.caltech.edu/TAP/sync?"
    "query=select+distinct+hostname+from+ps&format=json"
)


def _fetch_confirmed_hosts():
    """Fetch confirmed planet host star names from NASA Exoplanet Archive."""
    print("[REGISTRY] Downloading confirmed planet host list from NASA...", flush=True)
    try:
        resp = requests.get(NASA_TAP_URL, timeout=30)
        resp.raise_for_status()
        rows = resp.json()
        hosts = set()
        for row in rows:
            name = row.get("hostname", "").strip()
            if name:
                hosts.add(name.lower())
                # Also add common aliases
                # "Kepler-10" -> also store "KIC 11904151" style won't work
                # but storing the hostname is sufficient for our filter
        print(f"[REGISTRY] Loaded {len(hosts)} confirmed host stars.", flush=True)
        return hosts
    except Exception as e:
        print(f"[REGISTRY] WARNING: Could not fetch NASA archive: {e}", flush=True)
        return set()


def load_known_hosts():
    """Load confirmed hosts, using a local cache to avoid hammering NASA."""
    # Check cache freshness
    if os.path.exists(CACHE_FILE):
        age = time.time() - os.path.getmtime(CACHE_FILE)
        if age < CACHE_MAX_AGE_S:
            try:
                with open(CACHE_FILE, "r") as f:
                    data = json.load(f)
                print(f"[REGISTRY] Using cached host list ({len(data)} stars, {age/3600:.1f}h old)", flush=True)
                return set(data)
            except Exception:
                pass  # Fall through to re-download

    hosts = _fetch_confirmed_hosts()
    if hosts:
        with open(CACHE_FILE, "w") as f:
            json.dump(sorted(hosts), f)
    return hosts


def is_known_host(target_name, known_hosts=None):
    """Check if a target name matches a confirmed exoplanet host star."""
    if known_hosts is None:
        known_hosts = load_known_hosts()
    
    name_lower = target_name.strip().lower()
    
    # Direct match
    if name_lower in known_hosts:
        return True
    
    # Check if any known host is a substring using word boundaries
    # to prevent "kepler-10" from erroneously flagging "kepler-100"
    for host in known_hosts:
        pattern = r"\b" + re.escape(host) + r"\b"
        if re.search(pattern, name_lower):
            return True
        pattern_rev = r"\b" + re.escape(name_lower) + r"\b"
        if re.search(pattern_rev, host):
            return True
    
    return False


if __name__ == "__main__":
    hosts = load_known_hosts()
    print(f"Total confirmed host stars: {len(hosts)}")
    print("Sample:", sorted(hosts)[:10])
