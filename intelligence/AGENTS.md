# intelligence/ — Agent Guide

This is TheWarden's investigative HQ.

## Quick Start (every session)
```python
# Load forensic scanner
import requests
exec(requests.get(
    "https://raw.githubusercontent.com/StableExo/TheWarden/main/intelligence/red_web/warden_forensic_scan.py",
    headers={"Authorization": "Bearer <PAT>"}
).text, globals())
```

## Priority Targets (GL-L59)
1. `0x70a3df699512f39C682F94fad498454C90B8C219` — Red Web AGGREGATOR (~$922 ETH)
2. Walk kill chain: AGGREGATOR → APEX_PIVOT → GENESIS

## Required Keys
`arkham`, `chainbase`, `moralis`, `nansen`, `bitquery_client_id`, `bitquery_client_secret`
`goplus` = free (no key), `tenderly` = K5LF4-PBJUwWLL-BmD3LEn3e-GvguZ3k
