import { closeStreams as closeV1Streams } from "#v1/lifecycle"

/**
 * Ends every long-lived stream the API holds, across versions. The backend
 * calls it on shutdown before draining HTTP: these streams never end on their
 * own, so they would otherwise hold the drain until its timeout, and the
 * clients reconnect to the next instance.
 */
export function closeStreams(): void {
  closeV1Streams()
}
