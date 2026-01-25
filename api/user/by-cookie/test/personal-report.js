export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.json({ ok: true, path: '/api/user/by-cookie/test/personal-report', ts: new Date().toISOString() })
}
