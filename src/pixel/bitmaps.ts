export type Bitmap = readonly string[];

export const FISHER_A: Bitmap = [
  "................",
  "......nnnn......",
  ".....nnnnnn.....",
  ".....NNNNNN.....",
  "......ssss......",
  "......sese......",
  "......ssss......",
  ".....ooozoo.....",
  "....oooozooo....",
  "....oooozooo....",
  "....ooooooooos..",
  "....oooooooo....",
  "....oooooooo....",
  "....oooooooo....",
  ".....oooooo.....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....JJ..JJ.....",
  "....wwww.wwww...",
  "....bbbb.bbbb...",
];

export const FISHER_B: Bitmap = [
  "................",
  "......nnnn......",
  ".....nnnnnn.....",
  ".....NNNNNN.....",
  "......ssss......",
  "......sese......",
  "......ssss......",
  ".....ooozoo.....",
  "....oooozooo....",
  "....oooozooo....",
  "....oooooooo....",
  "....ooooooooos..",
  "....oooooooo....",
  "....oooooooo....",
  ".....oooooo.....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....jj..jj.....",
  ".....JJ..JJ.....",
  "....wwww.wwww...",
  "....bbbb.bbbb...",
];

export const CREEL: Bitmap = [
  "..wwwwwwwww..",
  "wwwwwwwwwwwww",
  "wWWWWWWWWWWWw",
  "wWbWWWWWbWWWw",
  "wWWWWWWWWWWWw",
  "wWbWWWWWbWWWw",
  ".wWWWWWWWWWw.",
  "..wwwwwwwww..",
];

export const BOBBER: Bitmap = [
  ".aaa.",
  "aaaaa",
  "aaaaa",
  ".ppp.",
  ".ppp.",
  "..p..",
];

export const LANTERN: Bitmap = [
  "..lll..",
  "..l.l..",
  ".LLLLL.",
  ".LgggL.",
  ".LgggL.",
  ".LgggL.",
  ".LLLLL.",
  "..LLL..",
];

export const CLOUD: Bitmap = [
  "..CCCC....",
  ".CCCCCCC..",
  "CCCCCCCCC.",
  ".CCCCCCCC.",
];

export const MOON: Bitmap = [
  "..mmmm..",
  ".mmmmmm.",
  "mmmmmmmm",
  "mmmmmmmm",
  "mmmmmmmm",
  "mmmmmmmm",
  ".mmmmmm.",
  "..mmmm..",
];

export const FISH: Bitmap = [
  "................",
  "d.........dd....",
  "dd.......dddd...",
  "ddd...ffffffff..",
  "dddd.ffffffffff.",
  "ddd.fffffefffff.",
  "dd..fffffffffff.",
  "d...llllffffff..",
  "......dddd......",
  "................",
];

export const BASS: Bitmap = [
  "..................",
  "......ddddddd.....",
  ".....ddddddddd....",
  "d...fffffffffff...",
  "dd.fffffffffffff..",
  "dddffffffffffffff.",
  "ddffffffffffffefff",
  "dddfffffffffffffff",
  "ddffffffffffffff..",
  "d.llllllllllll....",
  "....llllllll......",
  ".....dddd.........",
  "..................",
];

export const SHARK: Bitmap = [
  "..........................",
  "d...........dd............",
  "dd.........dddd...........",
  "ddd.......dddddd..........",
  ".ddd.....dddddddd.........",
  "..ddd..fffffffffffff......",
  "...ddffffffffffffffffff...",
  "..dddfffffffffffffffffffff",
  ".ddd.ffffffffefffffffffff.",
  "ddd...ffffffffffffffff....",
  "dd......ffff..ddd.........",
  "d.........dddd............",
  "..........ddd.............",
  "..........................",
];

export const TUNA: Bitmap = [
  "....................",
  "dd..................",
  ".dd........dd.......",
  "..dd.....ddddd......",
  "...dd..fffffffff....",
  "....dffffffffffffff.",
  "...ddfffffffffffffff",
  "...ddffffffffeffffff",
  "....dffffffffffffff.",
  "...dd..fffffffff....",
  "..dd....dd..dd......",
  ".dd.................",
  "dd..................",
  "....................",
];

export const GROUPER: Bitmap = [
  "..................................",
  "...........dddddddddddd...........",
  ".........dddddddddddddddd.........",
  "dd...fffffffffffffffffffffff......",
  "ddd.ffffffffffffffffffffffffff....",
  "dddffffffffffffffffffffffffffff...",
  "ddddffffffffffffffffffffffffffff..",
  "dddffffffffffffffffffffffffffffff.",
  "ddffffffffffffffffffffffffffefffff",
  "dddffffffffffffffffffffffffffffddd",
  "ddddffffffffffffffffffffffffffff..",
  "dddffffffffffffffffffffffffffff...",
  "ddfffffffffffffffffffffffffff.....",
  "dd..lllllllllllllllllllllll.......",
  "......dddd.....dddd...............",
  "..................................",
];

export const SUN_ICON: Bitmap = [
  "......s......",
  ".s....s....s.",
  "..s.......s..",
  ".....sss.....",
  "....sssss....",
  "...sssssss...",
  "ss.sssssss.ss",
  "...sssssss...",
  "....sssss....",
  ".....sss.....",
  "..s.......s..",
  ".s....s....s.",
  "......s......",
];

export const MOON_ICON: Bitmap = [
  ".......mmmm..",
  ".....mmmmmmm.",
  "....mmmmmm...",
  "....mmmmm....",
  "...mmmmm.....",
  "...mmmm......",
  "...mmmm......",
  "...mmmm......",
  "...mmmmm.....",
  "....mmmmm....",
  "....mmmmmm...",
  ".....mmmmmmm.",
  ".......mmmm..",
];

export const CAUGHT_FISH: Bitmap = [
  "d.ffff",
  "ddffef",
  "d.ffff",
];

export const MINNOW: Bitmap = ["f..ff..", ".ffffff", "f..ff.."];

export const CATCH_BITMAPS: Bitmap[] = [FISH, BASS, SHARK, TUNA, GROUPER];

export const CATCH_DRIFT = [0.9, 0.85, 0.7, 0.85, 0.3];

export const MARLIN: Bitmap = [
  ".............dd.....................",
  ".............dddd...................",
  "............ddddddd.................",
  "..........ddddddddddd...............",
  ".d.....dddddddddddddddd.............",
  "dd...dddddddddddddddddddd...........",
  "dd.ffffffffffffffffffffffff.........",
  "dffffffffffffffffffffffffeffdddddddd",
  ".ddffffffffffffffffffffffff.........",
  "..ffflllllllllllllllllllll..........",
  ".dd.llllllllllllllllllll............",
  "dd.....ll.....llllllll..............",
  "dd..............llll................",
  "....................................",
  "....................................",
  "....................................",
];

export const REEL_ORBIT = [
  [0, -1],
  [1, -1],
  [2, 0],
  [2, 1],
  [1, 2],
  [0, 2],
  [-1, 1],
  [-1, 0],
] as const;
