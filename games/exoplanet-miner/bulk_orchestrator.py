import json
import sys
import time
import hashlib
import random
from miner import mine_target
from veritas_build import create_veritas_claim
from transit_evaluator import evaluate_transit_data
from known_planets import load_known_hosts, is_known_host

def fetch_target_pool():
    """
    Phase 1: Single bulk MAST query to build a target pool.
    Does ONE search per sector instead of one per target.
    Returns a list of unique target names with their data source.
    """
    import lightkurve as lk
    
    pool = []
    seen = set()
    
    # Strategy: search a few random Kepler field patches + TESS sectors
    # Kepler field: RA ~290, Dec ~44 (center), spans ~10deg
    # Each search returns dozens-hundreds of targets in one API call
    sectors = [
        # (RA, Dec, source_priority)
        (290.0, 44.0, "Kepler"),   # Kepler field center
        (285.0, 40.0, "Kepler"),   # Kepler field SW
        (295.0, 48.0, "Kepler"),   # Kepler field NE
        (292.0, 42.0, "Kepler"),   # Kepler field S
        (288.0, 46.0, "Kepler"),   # Kepler field NW
    ]
    
    # Also add some randomized patches
    for _ in range(3):
        ra = random.uniform(280.0, 300.0)
        dec = random.uniform(36.0, 52.0)
        sectors.append((ra, dec, "TESS"))
    
    for ra, dec, preferred_source in sectors:
        try:
            # Small radius = fast query, still gets multiple targets
            sr = lk.search_lightcurve(f"{ra} {dec}", radius=120, author=preferred_source)
            
            if len(sr) == 0 and preferred_source == "TESS":
                sr = lk.search_lightcurve(f"{ra} {dec}", radius=120, author="Kepler")
                preferred_source = "Kepler"
            
            if len(sr) > 0:
                raw_targets = set()
                for r in sr:
                    tn = r.target_name
                    # target_name can be a numpy array, list, or string
                    if hasattr(tn, '__iter__') and not isinstance(tn, str):
                        tn = str(tn[0]) if len(tn) > 0 else str(tn)
                    else:
                        tn = str(tn)
                    # Convert kplr format to KIC for lightkurve resolution
                    if tn.startswith('kplr'):
                        kic_id = tn.replace('kplr', '').lstrip('0')
                        tn = f"KIC {kic_id}"
                    raw_targets.add(tn)
                
                for t in raw_targets:
                    if t not in seen:
                        seen.add(t)
                        pool.append({"name": t, "source": preferred_source, "ra": ra, "dec": dec})
        except Exception as e:
            print(f"[POOL] Sector query error at RA={ra:.1f} DEC={dec:.1f}: {str(e)[:60]}", flush=True)
            continue
    
    random.shuffle(pool)
    return pool


def run_bulk_scan():
    """
    True autonomous discovery engine.
    
    Architecture:
    1. Single bulk MAST query builds a target pool (fast — one API call per sector)
    2. Load confirmed host list from NASA Exoplanet Archive
    3. For each pooled target: run BLS, evaluate with AI oracle, persist
    """
    
    yield {"type": "info", "message": "============================================="}
    yield {"type": "info", "message": " VERITAS DEEP SPACE DISCOVERY ENGINE v2.0.0 "}
    yield {"type": "info", "message": "============================================="}
    
    # Load the confirmed planet host exclusion list
    yield {"type": "info", "message": "[*] Loading NASA Exoplanet Archive exclusion list..."}
    known_hosts = load_known_hosts()
    yield {"type": "info", "message": f"[*] {len(known_hosts)} confirmed host stars loaded."}
    
    # Phase 1: Build target pool with bulk MAST queries
    yield {"type": "info", "message": "[*] Phase 1: Building target pool from MAST catalog..."}
    yield {"type": "info", "message": "[*] This queries multiple sky sectors in batch (much faster than per-target)..."}
    
    try:
        pool = fetch_target_pool()
    except Exception as e:
        yield {"type": "info", "message": f"[!] Pool fetch error: {str(e)[:100]}"}
        pool = []
    
    if not pool:
        yield {"type": "info", "message": "[!] No targets found in pool. Trying direct catalog search..."}
        # Fallback: search for specific well-observed targets by name
        import lightkurve as lk
        fallback_targets = []
        try:
            sr = lk.search_lightcurve("KIC", radius=300, author="Kepler")
            if len(sr) > 0:
                for r in sr:
                    fallback_targets.append({"name": str(r.target_name), "source": "Kepler", "ra": 0, "dec": 0})
        except Exception:
            pass
        pool = fallback_targets
    
    yield {"type": "info", "message": f"[*] Target pool: {len(pool)} candidates ready for analysis"}
    
    # Phase 2: Iterate through pool
    discoveries = 0
    processed = 0
    
    for idx, entry in enumerate(pool):
        target = entry["name"]
        source = entry["source"]
        processed += 1
        
        # Check novelty
        is_known = is_known_host(target, known_hosts)
        novelty_tag = "KNOWN HOST" if is_known else "UNCONFIRMED"
        
        yield {"type": "info", "message": f"[Scan {processed}/{len(pool)}] Target: {target} [{source}] [{novelty_tag}]"}
        yield {"type": "status", "target": target, "state": "calibrating"}
        
        # Mine the target lightcurve
        try:
            results = mine_target(target, save_single=False)
        except Exception as e:
            yield {"type": "info", "message": f"[-] Mining error for {target}: {str(e)[:100]}"}
            time.sleep(0.5)
            continue
            
        if not results:
            yield {"type": "info", "message": f"[-] No usable data for {target}. Next target..."}
            time.sleep(0.5)
            continue
            
        # Compute payload hash for integrity
        payload_hash = hashlib.sha256(json.dumps(results, sort_keys=True, default=str).encode('utf-8')).hexdigest()
        
        if results.get("ai_verdict") == "TERMINAL_SHUTDOWN":
            yield {"type": "info", "message": f"[-] {target}: TERMINAL SHUTDOWN -- {results.get('message', '')}"}
            candidate = {
                "target": target,
                "data": results,
                "claim": None,
                "ai_verdict": "TERMINAL_SHUTDOWN",
                "ai_reasoning": results.get("message", "Missing deterministic criteria."),
                "payload_hash": payload_hash,
                "is_novel": False,
                "data_source": source
            }
            yield {"type": "candidate", "data": candidate}
            time.sleep(0.5)
            continue
            
        # Add novelty and source metadata
        results["is_novel"] = not is_known
        results["novelty_status"] = novelty_tag
        results["data_source"] = source
        
        snr = results.get('snr', 0)
        depth = results.get('depth', 0)
        period = results.get('period_days', 0)
        
        yield {"type": "info", "message": f"[+] Signal: SNR={snr:.2f}, Depth={depth:.6f}, Period={period:.4f}d"}
        yield {"type": "status", "target": target, "state": "mining"}
        
        # Build VERITAS Claim
        try:
            claim = create_veritas_claim(results)
        except Exception as e:
            yield {"type": "info", "message": f"[-] Claim build failed: {str(e)}"}
            continue
            
        # Evaluate with AI Oracle
        yield {"type": "info", "message": "[+] Engaging Oracle (qwen2.5:7b)..."}
        yield {"type": "status", "target": target, "state": "evaluating"}
        
        try:
            verdict_text = evaluate_transit_data(results)
        except Exception as e:
            verdict_text = f"[VERDICT: INCONCLUSIVE] Oracle error: {str(e)}"
            
        # Extract verdict from the LAST LINE only — prevents drift where
        # stray verdict keywords in reasoning text override the actual verdict
        verdict = "INCONCLUSIVE"
        lines = [l.strip() for l in verdict_text.strip().splitlines() if l.strip()]
        if lines:
            last_line = lines[-1]
            if "[VERDICT: PASS]" in last_line:
                verdict = "PASS"
            elif "[VERDICT: MODEL_BOUND]" in last_line:
                verdict = "MODEL_BOUND"
            elif "[VERDICT: INCONCLUSIVE]" in last_line:
                verdict = "INCONCLUSIVE"
            elif "[VERDICT: VIOLATION]" in last_line:
                verdict = "VIOLATION"
            else:
                # Fallback: scan last 3 lines in case model added trailing whitespace
                for line in reversed(lines[-3:]):
                    if "[VERDICT:" in line:
                        if "PASS" in line: verdict = "PASS"
                        elif "MODEL_BOUND" in line: verdict = "MODEL_BOUND"
                        elif "VIOLATION" in line: verdict = "VIOLATION"
                        else: verdict = "INCONCLUSIVE"
                        break

        candidate = {
            "target": target,
            "data": results,
            "claim": claim,
            "ai_verdict": verdict,
            "ai_reasoning": verdict_text,
            "payload_hash": payload_hash,
            "is_novel": not is_known,
            "data_source": source,
            "novelty_status": novelty_tag
        }
        
        # Report discovery
        if verdict == "PASS" and not is_known:
            discoveries += 1
            yield {"type": "info", "message": f"[!!!] *** NOVEL CANDIDATE DETECTED *** {target} -- Discovery #{discoveries}"}
        elif verdict == "PASS" and is_known:
            yield {"type": "info", "message": f"[=] Confirmed known planet rediscovered: {target}"}
        else:
            yield {"type": "info", "message": f"[=] Verdict: {verdict} -- {target} [{novelty_tag}]"}
        
        yield {"type": "candidate", "data": candidate}
        
        # Brief pause between targets
        time.sleep(1)
    
    yield {"type": "info", "message": f"[*] Scan complete. Processed: {processed}, Discoveries: {discoveries}"}
    yield {"type": "complete", "processed": processed, "discoveries": discoveries}

def main():
    for event in run_bulk_scan():
        if event["type"] == "info":
            print(event["message"])
        elif event["type"] == "candidate":
            d = event['data']
            tag = "NEW NOVEL" if d.get('is_novel') else "KNOWN"
            print(f"--> [{tag}] {d['target']}: {d['ai_verdict']}")

if __name__ == "__main__":
    main()
