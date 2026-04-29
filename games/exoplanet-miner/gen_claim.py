import json
import codecs
from veritas_build import create_veritas_claim
test_data = {
    'coordinate': 'TIC 123456',
    'target_id': '123456',
    'snr': 25.5,
    'depth': 0.002,
    'period_days': 3.14,
    'duration_days': 0.12,
    'data_source': 'TESS',
    'flux_std': 0.0005,
    'rp_rs_ratio': 0.045,
    'is_novel': True
}
claim = create_veritas_claim(test_data)
with codecs.open('current_claim.json', 'w', encoding='utf-8') as f:
    json.dump(claim, f)
