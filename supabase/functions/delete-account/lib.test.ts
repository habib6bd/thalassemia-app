import { assertEquals } from "jsr:@std/assert@1";

import { bearerToken } from "./lib.ts";

Deno.test("bearerToken extracts the token", () => {
  assertEquals(bearerToken("Bearer abc.def.ghi"), "abc.def.ghi");
  assertEquals(bearerToken("bearer abc"), "abc");
});

Deno.test("bearerToken rejects missing or malformed headers", () => {
  assertEquals(bearerToken(null), null);
  assertEquals(bearerToken(""), null);
  assertEquals(bearerToken("Basic abc"), null);
  assertEquals(bearerToken("Bearer"), null);
  assertEquals(bearerToken("Bearer a b"), null);
});
