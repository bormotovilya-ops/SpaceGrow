module.exports = (req, res) => {
  try { res.setHeader('content-type', 'application/json; charset=utf-8') } catch (e) {}
  return res.json({ status: 'ok' })
}
