import requests
import json
import sys

def evaluate_transit_data(data, stellar_context=None):
    """Evaluate transit data with optional SIMBAD stellar context."""
    
    # === DETERMINISTIC HARD GATES (pre-Oracle) ===
    # These execute BEFORE the LLM call and override any narrative verdict.
    
    depth = data.get('depth', 0)
    flux_std = data.get('flux_std', 0)
    snr = data.get('snr', 0)
    
    # Gate 1: Morphology ratio — baseline noise rivals transit depth
    if depth > 0 and flux_std > 0:
        morphology_ratio = flux_std / depth
        if morphology_ratio > 0.5:
            return (
                f"DETERMINISTIC GATE: flux_std/depth = {morphology_ratio:.3f} > 0.5 threshold. "
                f"Baseline noise ({flux_std:.6f}) rivals transit depth ({depth:.6f}). "
                f"Signal is indistinguishable from stellar variability or contact binary.\n\n"
                f"[VERDICT: MODEL_BOUND]"
            )
    
    # Gate 2: Eclipsing binary depth threshold
    if depth >= 0.05:
        return (
            f"DETERMINISTIC GATE: depth = {depth:.4f} >= 0.05. "
            f"Flux depression exceeds planetary transit ceiling. Eclipsing binary signature.\n\n"
            f"[VERDICT: MODEL_BOUND]"
        )
    
    # Gate 3: Insufficient SNR
    if snr <= 5.0:
        return (
            f"DETERMINISTIC GATE: SNR = {snr:.2f} <= 5.0. "
            f"Signal below minimum statistical significance threshold.\n\n"
            f"[VERDICT: INCONCLUSIVE]"
        )
    
    # Gate 4: ±5% Harmonic Contamination (BLS period vs stellar rotation)
    bls_period = data.get('period_days', 0)
    rotation_period = data.get('stellar_rotation_period_days', None)
    if bls_period > 0 and rotation_period is not None and rotation_period > 0:
        # Check harmonics: 1x, 2x, 0.5x, 3x, 1/3x
        harmonics = [
            (1.0, "1:1 fundamental"),
            (2.0, "2:1 harmonic"),
            (0.5, "1:2 sub-harmonic"),
            (3.0, "3:1 harmonic"),
            (1.0/3.0, "1:3 sub-harmonic"),
        ]
        for multiplier, label in harmonics:
            harmonic_period = rotation_period * multiplier
            if harmonic_period > 0:
                ratio = abs(bls_period - harmonic_period) / harmonic_period
                if ratio <= 0.05:  # ±5% tolerance
                    return (
                        f"DETERMINISTIC GATE: Harmonic contamination detected. "
                        f"BLS period ({bls_period:.4f}d) is within ±5% of stellar rotation "
                        f"{label} ({harmonic_period:.4f}d, ratio={ratio:.4f}). "
                        f"Stellar rotation period: {rotation_period:.4f}d. "
                        f"Signal likely originates from starspot modulation, not a transit.\n\n"
                        f"[VERDICT: MODEL_BOUND]"
                    )
    
    # === End deterministic gates — proceed to Oracle ===
    
    # Build context block
    stellar_block = ""
    if stellar_context:
        stellar_block = f"""

{stellar_context}

When evaluating, factor in the stellar classification above. A rotating variable host may produce periodic dips from starspot modulation. A subgiant host has R_star > 1 R_sun, which changes the companion radius estimate. An eclipsing binary classification strongly suggests the transit is stellar, not planetary.
"""
    
    prompt = f"""You are an autonomous astrophysics reasoning engine under strict NAEF (Narrative-Based Agentic Failure Evaluation) compliance.
Evaluate the following BLS periodogram detection parameters for an exoplanet transit anomaly.
Do NOT express optimism, defer closure, or provide narrative justification.
State mathematically if this resembles an eclipsing binary false-positive or a sub-stellar transit candidate.

DETECTION PARAMETERS:
- Target ID: {data.get('target_id', 'Unknown')}
- Coordinate: {data.get('coordinate', 'Unknown')}
- Orbital Period: {data.get('period_days', 0)} days
- Transit Duration: {data.get('duration_days', 0)} days
- Fraction Flux Depth: {data.get('depth', 0)}
- Max Power: {data.get('max_power', 0)}
- SNR: {data.get('snr', 0)}
- Stellar Rotation Period: {data.get('stellar_rotation_period_days', 'N/A')} days
- Flux StdDev: {data.get('flux_std', 0)}
{stellar_block}
DECISION CRITERIA (deterministic):
- If SNR > 10.0 AND fraction flux depth < 0.05 (small radius relative to star): verdict is PASS.
- If depth >= 0.05 (suggesting eclipsing binary, not a planet): verdict is MODEL_BOUND.
- If SNR <= 10.0, or data is noisy/ambiguous: verdict is INCONCLUSIVE.
- If flux_std / depth > 0.5: baseline noise rivals transit depth (likely a contact binary or variable flag). Set verdict to MODEL_BOUND.
- If host is classified as eclipsing binary in SIMBAD: verdict is MODEL_BOUND regardless of SNR.
- If host is a rotating variable, note starspot contamination risk but do not auto-downgrade if SNR and depth criteria are met.

RESPONSE FORMAT:
Provide your output in JSON format with exactly two keys: "reasoning" (containing your 3-5 sentences of analysis) and "verdict" (which MUST be exactly "PASS", "MODEL_BOUND", or "INCONCLUSIVE").
Parse your own reasoning before emitting the verdict."""
    
    url = "http://localhost:11434/api/generate"
    payload = {
        "model": "qwen2.5:7b",
        "prompt": prompt,
        "stream": False,
        "format": {
            "type": "object",
            "properties": {
                "reasoning": {"type": "string"},
                "verdict": {"type": "string", "enum": ["PASS", "MODEL_BOUND", "INCONCLUSIVE"]}
            },
            "required": ["reasoning", "verdict"]
        },
        "options": {
            "num_predict": -1,
            "temperature": 0.1
        }
    }

    try:
        response = requests.post(url, json=payload, timeout=50)
        result = response.json()
        try:
            parsed = json.loads(result["response"])
            return f"{parsed.get('reasoning', '')}\n\n[VERDICT: {parsed.get('verdict', 'INCONCLUSIVE').upper()}]"
        except Exception:
            return result["response"]
    except Exception as e:
        return f"Oracle Connection Failed: {e}"

def evaluate_transit(candidate_file="candidate_anomaly.json"):
    try:
        with open(candidate_file, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print("Candidate file not found. Run miner.py first.")
        return
        
    print("[EVALUATOR] Querying local high-reasoning model...")
    response_text = evaluate_transit_data(data)
    print("\n=== EVALUATION REPORT ===")
    print(response_text)
    print("=========================\n")

if __name__ == "__main__":
    evaluate_transit()
