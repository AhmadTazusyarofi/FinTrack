const RESET  = '\x1b[0m'
const BOLD   = '\x1b[1m'
const DIM    = '\x1b[2m'
const RED    = '\x1b[31m'
const GREEN  = '\x1b[32m'
const YELLOW = '\x1b[33m'
const BLUE   = '\x1b[34m'
const CYAN   = '\x1b[36m'
const WHITE  = '\x1b[37m'

function timestamp() {
  return DIM + new Date().toLocaleTimeString('id-ID', { hour12: false }) + RESET
}

function statusColor(status: number) {
  if (status >= 500) return RED + BOLD + status + RESET
  if (status >= 400) return YELLOW + BOLD + status + RESET
  if (status >= 300) return CYAN + status + RESET
  return GREEN + BOLD + status + RESET
}

function methodColor(method: string) {
  const colors: Record<string, string> = {
    GET:    BLUE + BOLD,
    POST:   GREEN + BOLD,
    PUT:    YELLOW + BOLD,
    PATCH:  CYAN + BOLD,
    DELETE: RED + BOLD,
  }
  return (colors[method] ?? WHITE + BOLD) + method + RESET
}

export function logAccess(method: string, url: string, status: number, ms: number) {
  const ms_str = ms < 100
    ? GREEN + ms + 'ms' + RESET
    : ms < 500
      ? YELLOW + ms + 'ms' + RESET
      : RED + ms + 'ms' + RESET

  console.log(`${timestamp()}  ${methodColor(method).padEnd(14)} ${WHITE + url + RESET.padEnd(0)}  ${statusColor(status)}  ${ms_str}`)
}

export function logError(label: string, err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : ''
  console.error(`${timestamp()}  ${RED + BOLD}ERROR${RESET}  ${YELLOW + label + RESET}`)
  console.error(`${RED}  ${msg}${RESET}`)
  if (stack) {
    const lines = stack.split('\n').slice(1, 4)
    lines.forEach(l => console.error(DIM + l + RESET))
  }
}

export function logInfo(msg: string) {
  console.log(`${timestamp()}  ${CYAN + BOLD}INFO${RESET}   ${msg}`)
}

export function logWarn(msg: string) {
  console.warn(`${timestamp()}  ${YELLOW + BOLD}WARN${RESET}   ${msg}`)
}
