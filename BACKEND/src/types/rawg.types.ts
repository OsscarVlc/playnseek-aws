export interface IRawgPlatform {
    platform: {
        id: number;
        name: string;
        slug: string;
    };
}

export interface IRawgGenre {
    id: number;
    name: string;
    slug: string;
}

export interface IRawgJuegoDetalle {
    name: string;
    background_image: string;
    id: number;
    genres: IRawgGenre[];
    platforms: IRawgPlatform[];
}
