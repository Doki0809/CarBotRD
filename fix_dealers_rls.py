import urllib.request, json, ssl

ctx = ssl.create_default_context()

sql = """
DROP POLICY IF EXISTS "dealers_select_own" ON public.dealers;
CREATE POLICY "dealers_select_own" ON public.dealers FOR SELECT
  USING (auth.role() = 'authenticated');
"""

payload = json.dumps({'query': sql}).encode('utf-8')
req = urllib.request.Request(
    'https://api.supabase.com/v1/projects/lpiwkennlavpzisdvnnh/database/query',
    data=payload,
    method='POST'
)
req.add_header('Authorization', 'Bearer sbp_1c9d61d15925cf3579e6294023069d120525ff60')
req.add_header('Content-Type', 'application/json')
req.add_header('Accept', 'application/json')

try:
    with urllib.request.urlopen(req, context=ctx) as r:
        print("OK:", r.read().decode())
except urllib.error.HTTPError as e:
    print("ERR:", e.code, e.read().decode())
