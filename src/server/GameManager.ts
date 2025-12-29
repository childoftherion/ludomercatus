import { GameRoom } from "./GameRoom";

export class GameManager {
  private static instance: GameManager;
  public rooms: Map<string, GameRoom> = new Map();

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public createRoom(roomId: string, mode: "single" | "multi" = "single"): GameRoom {
    const room = new GameRoom(mode === "multi" ? "lobby" : "setup");
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  public getRoomList(): { id: string; players: number }[] {
    return Array.from(this.rooms.entries()).map(([id, room]) => ({
      id,
      players: room.state.players.length
    }));
  }
}
