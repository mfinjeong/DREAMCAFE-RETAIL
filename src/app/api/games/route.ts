import { NextResponse } from "next/server";
import { listGames, createGame, getGameGenres } from "@/services/game.service";
import { gameSchema, gameQuerySchema } from "@/lib/validators";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const platform = (searchParams.get("platform") as "ALL" | "PC" | "CONSOLE") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const status = (searchParams.get("status") as "ALL" | "ACTIVE" | "INACTIVE") || undefined;

    const validatedQuery = gameQuerySchema.parse({ q, platform, genre, status });
    const games = await listGames(validatedQuery);
    const genres = await getGameGenres();

    return NextResponse.json({
      success: true,
      data: games,
      meta: {
        total: games.length,
        genres,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server saat memuat katalog game";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = gameSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { success: false, message: validated.error.errors[0].message },
        { status: 400 }
      );
    }

    const game = await createGame(validated.data);
    return NextResponse.json(
      {
        success: true,
        data: game,
        message: `Game '${game.title}' berhasil ditambahkan ke pustaka`,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal menambahkan game baru";
    return NextResponse.json({ success: false, message: msg }, { status: 400 });
  }
}
