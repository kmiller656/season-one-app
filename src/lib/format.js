// Pull dollar amounts out of a free-text compensation string.
// Handles "$145,000 - $165,000", "$95 - $110 / hr", "120k", etc.
export function extractAmounts(text) {
  if (!text) return []
  const out = []
  const re = /([\d][\d,]*(?:\.\d+)?)\s*(k)?/gi
  let m
  while ((m = re.exec(text))) {
    let n = parseFloat(m[1].replace(/,/g, ''))
    if (Number.isNaN(n)) continue
    if (m[2]) n *= 1000
    out.push(n)
  }
  return out
}

// Best-effort annualized midpoint for charts/averages.
export function compMidpointAnnual(compensation, type) {
  const nums = extractAmounts(compensation).filter((n) => n > 0)
  if (!nums.length) return null
  const mid =
    nums.length >= 2
      ? (Math.min(...nums) + Math.max(...nums)) / 2
      : nums[0]
  if (type === 'hourly') return Math.round(mid * 40 * 52) // ~2,080 hrs/yr
  return Math.round(mid)
}

export function formatUSD(n, { compact = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(n)
}

export function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function timeAgo(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const diff = Date.now() - d.getTime()
  const day = 86400000
  if (diff < day) return 'Today'
  if (diff < 2 * day) return 'Yesterday'
  if (diff < 7 * day) return `${Math.floor(diff / day)} days ago`
  return formatDate(iso)
}
