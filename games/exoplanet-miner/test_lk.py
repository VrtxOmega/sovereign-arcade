import lightkurve as lk
import random

def test_search():
    ra = random.uniform(280.0, 300.0)
    dec = random.uniform(36.0, 52.0)
    crd = f"{ra} {dec}"
    print(f"Searching coord {crd}...")
    try:
        sr = lk.search_lightcurve(crd, radius=3000, author='Kepler')
        if len(sr) > 0:
            print(f"Found {len(sr)} results!")
            for r in sr[0:3]:
                print(r.target_name)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test_search()
