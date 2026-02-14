/**
 * Upload a Buffer (PNG image) to a GitHub repository via the Contents API.
 *
 * Requires env vars:
 *   GITHUB_TOKEN  – personal-access-token with `repo` / `contents:write` scope
 *   GITHUB_REPO   – "owner/repo" of the image-hosting repository
 *   GITHUB_BRANCH – (optional) target branch, defaults to "main"
 */

const GITHUB_API = 'https://api.github.com'

/**
 * @param {Buffer}  imageBuffer  – PNG image data
 * @param {string}  filePath     – destination inside the repo, e.g. "john/hello.png"
 * @returns {Promise<string>}    – raw.githubusercontent URL of the uploaded file
 */
async function uploadToGitHub (imageBuffer, filePath) {
  const token = process.env.GITHUB_TOKEN
  const repo = process.env.GITHUB_REPO // e.g. "myorg/quote-images"
  const branch = process.env.GITHUB_BRANCH || 'main'

  if (!token || !repo) {
    throw new Error('GITHUB_TOKEN or GITHUB_REPO is not configured')
  }

  const apiUrl = `${GITHUB_API}/repos/${repo}/contents/${filePath}`

  // Check whether the file already exists (we need its sha to overwrite)
  let existingSha
  try {
    const check = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    })
    if (check.ok) {
      const json = await check.json()
      existingSha = json.sha
    }
  } catch (_) {
    // file does not exist yet – that's fine
  }

  const body = {
    message: `upload ${filePath}`,
    content: imageBuffer.toString('base64'),
    branch
  }
  if (existingSha) body.sha = existingSha

  const res = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`GitHub upload failed (${res.status}): ${text}`)
  }

  const data = await res.json()

  // Return the raw URL for direct browser access
  return data.content.download_url
}

module.exports = { uploadToGitHub }
