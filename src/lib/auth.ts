export function isAuthed(cookieVal: string | undefined, passphrase: string): boolean {
  return !!cookieVal && cookieVal === passphrase
}
