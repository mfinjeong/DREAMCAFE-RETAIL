import { NextResponse } from "next/server";
import { listGames, createGame, getGameGenres } from "@/services/game.service";
import { gameSchema, gameQuerySchema } from "@/lib/validators";
import { requireUser, apiErrorResponse } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireUser();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || undefined;
    const platform = (searchParams.get("platform") as "ALL" | "PC" | "CONSOLE") || undefined;
    const genre = searchParams.get("genre") || undefined;
    const status = (searchParams.get("status") as "ALL" | "ACTIVE" | "INACTIVE") || undefined;

    const validatedQuery = gameQuerySchema.parse({ q, platform, genre, status });
    const [games, genres] = await Promise.all([
      listGames(validatedQuery),
      getGameGenres(),
    ]);

    return NextResponse.json({
      success: true,
      data: games,
      meta: {
        total: games.length,
        genres,
      },
    });
  } catch (err: unknown) {
    return apiErrorResponse(err, "Terjadi kesalahan server saat memuat katalog game", 500);
  }
}

export async function POST(request: Request) {
  try {
    await requireUser(["ADMIN"]);

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
    return apiErrorResponse(err, "Gagal menambahkan game baru", 400);
  }
}
