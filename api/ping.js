module.exports = (req, res) => {
  try {
    if (res.setHeader) res.setHeader('Content-Type', 'application/json; charset=utf-8')
  } catch (e) {}

  try {
    res.statusCode = 200
    return res.end(JSON.stringify({ status: 'ok' }))
  } catch (e) {
    // fallback: write minimal response
    try { res.writeHead && res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }) } catch (__) {}
    try { res.end(JSON.stringify({ status: 'ok' })) } catch (__e) {}
  }
}
