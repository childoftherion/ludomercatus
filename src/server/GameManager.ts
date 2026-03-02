import { GameRoom } from './GameRoom'

const ROOM_IDLE_TIMEOUT_MS = 10 * 60 * 1000 // 10 minutes
const CLEANUP_INTERVAL_MS = 60 * 1000 // check every minute

export class GameManager {
  private static instance: GameManager
  public rooms: Map<string, GameRoom> = new Map()
  private roomLastActivity: Map<string, number> = new Map()
  private cleanupTimer: ReturnType<typeof setInterval> | null = null

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager()
    }
    return GameManager.instance
  }

  public createRoom(
    roomId: string,
    mode: 'single' | 'multi' = 'single',
  ): GameRoom {
    const room = new GameRoom(mode === 'multi' ? 'lobby' : 'setup')
    this.rooms.set(roomId, room)
    this.roomLastActivity.set(roomId, Date.now())
    this.ensureCleanupRunning()
    return room
  }

  public getRoom(roomId: string): GameRoom | undefined {
    const room = this.rooms.get(roomId)
    if (room) this.roomLastActivity.set(roomId, Date.now())
    return room
  }

  public deleteRoom(roomId: string): boolean {
    const deleted = this.rooms.delete(roomId)
    this.roomLastActivity.delete(roomId)
    if (deleted) {
      console.log(`[GameManager] Room '${roomId}' deleted`)
    }
    return deleted
  }

  public getRoomList(): { id: string; players: number }[] {
    return Array.from(this.rooms.entries()).map(([id, room]) => ({
      id,
      players: room.state.players.length,
    }))
  }

  /** Mark a room as recently active (call from websocket message handler) */
  public touchRoom(roomId: string): void {
    if (this.rooms.has(roomId)) {
      this.roomLastActivity.set(roomId, Date.now())
    }
  }

  private ensureCleanupRunning(): void {
    if (this.cleanupTimer) return
    this.cleanupTimer = setInterval(() => this.cleanupIdleRooms(), CLEANUP_INTERVAL_MS)
  }

  private cleanupIdleRooms(): void {
    const now = Date.now()
    for (const [roomId, lastActivity] of this.roomLastActivity) {
      if (roomId === 'default') continue
      if (now - lastActivity > ROOM_IDLE_TIMEOUT_MS) {
        const room = this.rooms.get(roomId)
        const hasConnected = room?.state.players.some(p => p.isConnected) ?? false
        if (!hasConnected) {
          console.log(`[GameManager] Cleaning up idle room '${roomId}' (inactive for ${Math.round((now - lastActivity) / 1000)}s)`)
          this.deleteRoom(roomId)
        }
      }
    }
  }
}
