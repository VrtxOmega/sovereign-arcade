import lightkurve as lk
import numpy as np
import random
import json
import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

def mine_target(target_name="Kepler-10", save_single=True):
    """Searches a specific target, downloads lightcurve data, and runs BLS transit search."""
    
    print(f"Querying Target: {target_name} ...", flush=True)
    
    # Try TESS first (fresh data), fall back to Kepler
    search_result = lk.search_lightcurve(target_name, author='TESS')
    data_source = "TESS"
    
    if len(search_result) == 0:
        search_result = lk.search_lightcurve(target_name, author='Kepler')
        data_source = "Kepler"
    
    if len(search_result) == 0:
        print(f"  -> No lightcurves found for {target_name}.", flush=True)
        return None

    print(f"  -> Found {len(search_result)} observations from {data_source}! Downloading...", flush=True)
    
    # Download a manageable subset
    n_download = min(len(search_result), 6)
    try:
        lc_collection = search_result[0:n_download].download_all()
    except Exception as e:
        print(f"  -> Download failed: {e}", flush=True)
        return None
    
    # Stitch the light curves together
    lc = lc_collection.stitch()
    
    # Clean and flatten
    lc_clean = lc.remove_nans().remove_outliers(sigma=4)
    lc_flat = lc_clean.flatten(window_length=401)
    
    print("  -> Running Lomb-Scargle to extract stellar rotation...", flush=True)
    try:
        ls = lc_clean.to_periodogram(method='lombscargle', minimum_period=0.5, maximum_period=50.0)
        stellar_rotation_period_days = float(ls.period_at_max_power.value)
        print(f"     Stellar Rotation Period: {stellar_rotation_period_days:.4f} days", flush=True)
    except Exception as e:
        print(f"  -> Lomb-Scargle failed: {e}", flush=True)
        stellar_rotation_period_days = None

    print(f"  -> Star ID: {lc.meta.get('TARGETID', 'Unknown')}", flush=True)
    print(f"  -> Data points: {len(lc_flat.flux)}", flush=True)
    
    # Run Box Least Squares (BLS) with a REAL period grid
    # 0.5 to 30 days captures hot Jupiters, sub-Neptunes, and short-period Earths
    print("  -> Running BLS Periodogram Transit Search (0.5-30d)...", flush=True)
    period_grid = np.linspace(0.5, 30.0, 5000)
    
    try:
        bls = lc_flat.to_periodogram(method='bls', period=period_grid, frequency_factor=500)
    except Exception as e:
        print(f"  -> BLS failed: {e}", flush=True)
        return None
    
    # Extract properties
    best_period = bls.period_at_max_power.value
    best_t0 = bls.transit_time_at_max_power.value
    best_duration = bls.duration_at_max_power.value
    max_power = bls.max_power.value
    depth = bls.depth_at_max_power.value
    snr_array = bls.snr
    snr = float(snr_array[np.argmax(bls.power)]) if isinstance(snr_array, np.ndarray) else float(snr_array)
    
    # Compute estimated planet radius ratio (Rp/Rs = sqrt(depth))
    rp_rs_ratio = float(np.sqrt(abs(depth))) if depth > 0 else 0.0
    
    print(f"  -> [DETECTION RESULTS]", flush=True)
    print(f"     Period: {best_period:.4f} days", flush=True)
    print(f"     Duration: {best_duration:.4f} days", flush=True)
    print(f"     Depth: {depth:.6f} (flux fraction)", flush=True)
    print(f"     Rp/Rs: {rp_rs_ratio:.4f}", flush=True)
    print(f"     Power: {max_power:.2f}", flush=True)
    print(f"     SNR: {snr:.2f}", flush=True)
    
    # Extract astronomical metadata
    ra_obj = lc.meta.get('RA_OBJ', 0.0)
    dec_obj = lc.meta.get('DEC_OBJ', 0.0)
    stellar_radius = lc.meta.get('RADIUS', None)
    target_id = lc.meta.get('TARGETID', 'Unknown')
    
    # NAEF Halt on missing critical metadata
    if target_id == 'Unknown' or ra_obj is None or dec_obj is None:
        print("  -> WARNING: Missing critical metadata. NAEF Halt.", flush=True)
        return {
            "coordinate": target_name,
            "target_id": str(target_id),
            "ai_verdict": "TERMINAL_SHUTDOWN",
            "message": "Missing critical FITS metadata (RA/DEC/TARGETID)."
        }
    
    try:
        ra_val = float(ra_obj)
        dec_val = float(dec_obj)
        if np.isnan(ra_val) or np.isnan(dec_val):
            raise ValueError("NaN coordinates")
    except (TypeError, ValueError):
        print("  -> WARNING: Invalid coordinates. NAEF Halt.", flush=True)
        return {
            "coordinate": target_name,
            "target_id": str(target_id),
            "ai_verdict": "TERMINAL_SHUTDOWN",
            "message": "Invalid RA/DEC coordinates."
        }
    
    # CLAEG Boundary Calculations
    std_dev = float(np.nanstd(lc_flat.flux.value))
    upper_bound = 1.0 + 3 * std_dev
    lower_bound = 1.0 - 3 * std_dev
    is_claeg_violation = snr < 10.0

    # Generate Transit Plot
    print("  -> Generating Transit Plot...", flush=True)
    
    os.makedirs("plots", exist_ok=True)
    filename_safe = str(target_name).replace(" ", "_").replace(".", "_")
    plot_filename = f"{filename_safe}.png"
    plot_path = os.path.join("plots", plot_filename)
    
    try:
        folded_lc = lc_flat.fold(period=best_period, epoch_time=best_t0)
        
        fig = plt.figure(figsize=(10, 6))
        
        if is_claeg_violation:
            phase_vals = folded_lc.phase.value
            transit_mask = (phase_vals > -0.05) & (phase_vals < 0.05)
            ax = folded_lc[~transit_mask].scatter(label=f"Baseline ({target_name})", color="#c9a84c", alpha=0.5, s=2)
            folded_lc[transit_mask].scatter(ax=ax, label=f"CLAEG Breach (red)", color="#ff4444", alpha=0.8, s=6)
        else:
            ax = folded_lc.scatter(label=f"Folded ({target_name})", color="#c9a84c", alpha=0.5, s=2)
        
        ax.axhline(y=upper_bound, color='#ff4444' if is_claeg_violation else '#888888', linestyle=':', alpha=0.7, label='+3σ Bound')
        ax.axhline(y=lower_bound, color='#ff4444' if is_claeg_violation else '#888888', linestyle=':', alpha=0.7, label='-3σ Bound')

        plt.title(f"Transit Plot: {target_name} (Period: {best_period:.3f}d, SNR: {snr:.1f})", color="white")
        
        fig = plt.gcf()
        fig.patch.set_facecolor('#0f0f0f')
        ax.set_facecolor('#0f0f0f')
        ax.xaxis.label.set_color('white')
        ax.yaxis.label.set_color('white')
        ax.tick_params(colors='white')
        plt.grid(color='#333333', linestyle='--', alpha=0.5)
        plt.legend(facecolor='#0f0f0f', edgecolor='#333333', labelcolor='white')
        
        plt.savefig(plot_path, dpi=100, bbox_inches='tight', facecolor=fig.get_facecolor())
        plt.close()
        plot_url = f"/api/plots/{plot_filename}"
    except Exception as e:
        print(f"  -> Warning: Plot generation failed: {e}")
        plot_url = None
        plt.close()
    
    # Build results
    results = {
        "coordinate": target_name,
        "target_id": str(target_id),
        "ra": ra_val,
        "dec": dec_val,
        "stellar_radius": float(stellar_radius) if stellar_radius is not None and hasattr(stellar_radius, '__float__') else None,
        "data_source": data_source,
        "plot_url": plot_url,
        "period_days": float(best_period),
        "duration_days": float(best_duration),
        "depth": float(depth),
        "rp_rs_ratio": rp_rs_ratio,
        "snr": float(snr),
        "max_power": float(max_power),
        "n_datapoints": len(lc_flat.flux),
        "flux_std": std_dev,
        "stellar_rotation_period_days": stellar_rotation_period_days,
    }
    
    if save_single:
        with open("candidate_anomaly.json", "w") as f:
            json.dump(results, f, indent=4)
        print("  -> Saved detection to candidate_anomaly.json", flush=True)
    return results

if __name__ == "__main__":
    print("=== Exoplanet Raw Miner ===")
    mine_target("TIC 261136679", save_single=True)
