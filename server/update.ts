// App updates: the code folder is a git clone of the Halo Labs repository. Every 15 minutes (sooner when the page
// asks for the status, and from Settings → Updates) this fetches origin/main and counts the new commits; "Update now" merges them in, and vite and node --watch
// (scripts/start.sh) pick up the new code by themselves (the server restarts mid-request when server/ changes, so the
// page polls the status until it reports the new version). An update that changes package-lock.json or the
// Dockerfile can't be applied from inside the running app: the status says so, and ./halo update does it on the Mac.
// Needs git in the image (Dockerfile). Private repository: a GitHub token in Settings → APIs → GitHub.
import { execFile } from 'node:child_process'
import { setting } from './settings.ts'

const CHECK_EVERY_MS = 15 * 60_000 // a quiet git fetch; also started when the page asks and the last check is older
const BRANCH = 'main'

export type UpdateStatus = {
  current: string | null; latest: string | null; behind: number; changes: string[]
  checkedAt: string | null; error: string | null; updating: boolean; terminal: boolean
}
let root = ''
let st: UpdateStatus = { current: null, latest: null, behind: 0, changes: [], checkedAt: null, error: null, updating: false, terminal: false }

function git(args: string[], timeout = 60_000): Promise<string> {
  const token = setting('GITHUB_TOKEN')
  const auth = token ? ['-c', `http.https://github.com/.extraheader=AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`] : []
  // safe.directory: the folder is owned by the Mac user, not the container's; identity: for merge commits.
  const base = ['-c', 'safe.directory=*', '-c', 'user.name=Halo Labs', '-c', 'user.email=halolabs@localhost', ...auth]
  return new Promise((resolve, reject) => execFile('git', [...base, ...args], { cwd: root, timeout, env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } },
    (e, out, err) => (e ? reject(new Error(clean(String(err || e.message)))) : resolve(String(out).trim()))))
}
// Plain-language errors; never echo the token.
function clean(msg: string) {
  if (/ENOENT|not found: git|spawn git/i.test(msg)) return 'git isn\'t in this Halo Labs image yet. Run ./halo rebuild once in Terminal.'
  if (/Authentication failed|could not read Username|403|401|Repository not found/i.test(msg)) return 'GitHub refused access. If the repository is private, add a GitHub token in Settings → APIs → GitHub.'
  if (/Could not resolve host|unable to access|timed out/i.test(msg)) return 'Couldn\'t reach GitHub. Check the internet connection.'
  return msg.replace(/AUTHORIZATION: basic \S+/gi, '').split('\n').filter(Boolean).slice(-2).join(' ').slice(0, 300)
}

/** The cached status, with the running version and the count of new commits read fresh from the local clone (no
 *  network): they change when an update lands, possibly as a merge commit, and the server restarts. */
export async function updateStatus() {
  if (!checking && (!st.checkedAt || Date.now() - Date.parse(st.checkedAt) > CHECK_EVERY_MS)) void checkForUpdate() // in the background
  try {
    const [current, behind] = await Promise.all([git(['rev-parse', '--short', 'HEAD']), git(['rev-list', '--count', `HEAD..origin/${BRANCH}`]).catch(() => String(st.behind))])
    st = { ...st, current, behind: Number(behind) || 0, ...(Number(behind) ? {} : { changes: [] }) }
  } catch (e) { if (!st.error) st = { ...st, error: (e as Error).message } }
  return st
}

let checking: Promise<UpdateStatus> | null = null
/** Fetch origin/main and compare. Concurrent calls share one fetch. */
export function checkForUpdate() { return (checking ??= fetchAndCompare().finally(() => { checking = null })) }

async function fetchAndCompare() {
  try {
    await git(['fetch', '--quiet', 'origin', BRANCH])
    const [current, latest, count, log, files] = await Promise.all([
      git(['rev-parse', '--short', 'HEAD']), git(['rev-parse', '--short', `origin/${BRANCH}`]),
      git(['rev-list', '--count', `HEAD..origin/${BRANCH}`]), git(['log', '--format=%s', '-n', '10', `HEAD..origin/${BRANCH}`]),
      git(['diff', '--name-only', `HEAD...origin/${BRANCH}`]),
    ])
    const terminal = files.split('\n').some(f => f === 'package-lock.json' || f === 'Dockerfile')
    st = { ...st, current, latest, behind: Number(count) || 0, changes: log ? log.split('\n') : [], terminal, checkedAt: new Date().toISOString(), error: null }
  } catch (e) {
    st = { ...st, checkedAt: new Date().toISOString(), error: (e as Error).message }
  }
  return st
}

/** Merge origin/main into the code folder. Refuses when the folder has uncommitted edits, and backs out of a merge
 *  that conflicts with the owner's own commits, so nothing of his is lost. */
export async function applyUpdate() {
  if (st.updating) throw new Error('An update is already running.')
  st = { ...st, updating: true }
  try {
    await checkForUpdate()
    if (st.error) throw new Error(st.error)
    if (!st.behind) return st
    if (st.terminal) throw new Error('This update installs new parts, so it runs from Terminal: ./halo update')
    if (await git(['status', '--porcelain', '--untracked-files=no'])) throw new Error('The code has changes that aren\'t committed yet (maybe from Claude). Ask Claude to commit them, then update.')
    const before = await git(['rev-parse', '--short', 'HEAD'])
    try { await git(['merge', '--ff-only', `origin/${BRANCH}`]) } catch {
      try { await git(['merge', '--no-edit', `origin/${BRANCH}`]) } catch {
        await git(['merge', '--abort']).catch(() => {})
        throw new Error('The update overlaps with changes made to this copy. Ask Claude to merge origin/main for you.')
      }
    }
    console.log(`update: ${before} → origin/${BRANCH} ${st.latest}`)
    return await checkForUpdate()
  } finally { st = { ...st, updating: false } }
}

export function startUpdateChecks(dir: string) {
  root = dir
  setTimeout(() => void checkForUpdate(), 30_000)
  setInterval(() => void checkForUpdate(), CHECK_EVERY_MS).unref()
}
