# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
"""Probe: consensus fetch of a Polymarket Gamma API market record.

Minimal contract for STEP 1 of the resolved-market calibration milestone.
Fetches a Gamma API market URL inside consensus, extracts the stable
`description` + `question` fields, and stores their SHA-256. Validators
re-fetch and must agree on the extracted description hash exactly; the
raw body is not hashed, so volatile API fields cannot break agreement.
Deleted after the probe; not part of the shipped contract.
"""
from genlayer import *
import json
import hashlib


def packed(x):
    return json.dumps(x, sort_keys=True, separators=(',', ':'))


def _extract(body):
    data = json.loads(body)
    if not isinstance(data, dict):
        raise gl.vm.UserError('NOT_OBJECT')
    desc = data.get('description')
    q = data.get('question')
    if not isinstance(desc, str) or not desc.strip():
        raise gl.vm.UserError('NO_DESCRIPTION')
    if not isinstance(q, str) or not q.strip():
        raise gl.vm.UserError('NO_QUESTION')
    return {'desc_sha256': hashlib.sha256(desc.encode()).hexdigest(),
            'desc_len': len(desc), 'question': q, 'desc_head': desc[:120]}


def _fetch_market(url):
    def fetch_body():
        try:
            response = gl.nondet.web.request(url, method='GET')
        except Exception as e:
            raise gl.vm.UserError('FETCH_FAILED: ' + str(e)[:200])
        if getattr(response, 'status', 200) != 200:
            raise gl.vm.UserError('FETCH_HTTP_' + str(getattr(response, 'status', '?')))
        body = response.body
        if isinstance(body, bytes):
            body = body.decode('utf-8')
        if not isinstance(body, str):
            raise gl.vm.UserError('FETCH_BODY_TYPE')
        return body

    def leader_fn():
        return _extract(fetch_body())

    def validator_fn(result):
        if not isinstance(result, gl.vm.Return):
            try:
                leader_fn()
            except Exception:
                return True
            return False
        try:
            return _extract(fetch_body()) == result.calldata
        except Exception:
            return False

    return gl.vm.run_nondet_unsafe(leader_fn, validator_fn)


class MarketProbe(gl.Contract):
    probes: TreeMap[str, str]

    def __init__(self):
        self.probes = TreeMap()

    @gl.public.write
    def fetch_probe(self, url: str) -> str:
        if not url.startswith('https://gamma-api.polymarket.com/markets/'):
            raise gl.vm.UserError('URL_HOST')
        result = _fetch_market(url)
        result['url'] = url
        raw = packed(result)
        self.probes[hashlib.sha256(url.encode()).hexdigest()[:16]] = raw
        return raw

    @gl.public.view
    def get_probe(self, url: str) -> str:
        return self.probes.get(hashlib.sha256(url.encode()).hexdigest()[:16], '')
