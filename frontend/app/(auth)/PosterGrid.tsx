"use client";

const TMDB_BASE = "https://image.tmdb.org/t/p/w500";

const posters = [
  { path: "/hr9rjR3J0xBBKmlJ4n3gHId9ccx.jpg", title: "Animal" },
  { path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg", title: "The Dark Knight" },
  { path: "/gmSRHU1Wtiatj8KoyVt8rT9ockx.jpg", title: "3 Idiots" },
  { path: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg", title: "Inception" },
  { path: "/tjpiEnZBUAA8pdNPRKa5vP2Zpqw.jpg", title: "RRR" },
  { path: "/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg", title: "Avengers: Endgame" },
  { path: "/unqiPjtc6CGqs13zho7ZvWU85zu.jpg", title: "Kabir Singh" },
  { path: "/yQvGrMoipbRoddT0ZR8tPoR7NfX.jpg", title: "Interstellar" },
  { path: "/z2x2Y4tncefsIU7h82gmUM5vnBJ.jpg", title: "PK" },
  { path: "/gKY6q7SjCkAU6FqvqWybDYgUKIF.jpg", title: "Avatar" },
  { path: "/1CoKNi3XVyijPCvy0usDbSWEXAg.jpg", title: "Dangal" },
  { path: "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg", title: "Forrest Gump" },
  { path: "/q1wkN4VQuBTj1AeyTLLz2w6awMA.jpg", title: "Sanju" },
  { path: "/8FHOtUpNIk5ZPEay2N2EY5lrxkv.jpg", title: "Dhurandhar" },
  { path: "/56snL7jpuKS80WBSXJCg59XdvM3.jpg", title: "Chhichhore" },
  { path: "/OjJ2eZFMr0InHxjYCQXwxDoo4v.jpg",  title: "Munna Bhai MBBS" },
  { path: "/yUSL24kpHc9Nls4Pohia4shgcIM.jpg", title: "Swades" },
];

const COLS = 7;

export default function PosterGrid() {
  const columns: typeof posters[] = Array.from({ length: COLS }, (_, col) => {
    const count = col % 2 === 0 ? 4 : 5;
    return Array.from({ length: count }, (_, row) => {
      return posters[(col * 5 + row) % posters.length];
    });
  });

  return (
    <div
      className="absolute inset-0 flex gap-[10px] px-[10px] items-center"
      style={{ transform: "rotate(-4deg) scale(1.12)" }}
    >
      {columns.map((col, ci) => (
        <div
          key={ci}
          className="flex flex-col gap-[10px] shrink-0"
          style={{ marginTop: ci % 2 === 1 ? "-60px" : "0" }}
        >
          {col.map((movie, ri) => (
            <div
              key={ri}
              className="w-[130px] rounded-[6px] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.7)] shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${TMDB_BASE}${movie.path}`}
                alt={movie.title}
                title={movie.title}
                width={130}
                height={195}
                className="w-full h-[195px] object-cover block"
                style={{ filter: "saturate(0.85) contrast(1.05)" }}
                loading="lazy"
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
