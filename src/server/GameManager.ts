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

  public createRoom(roomId: string): GameRoom {
    const room = new GameRoom();
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }
}
