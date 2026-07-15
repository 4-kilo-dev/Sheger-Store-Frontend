import { router, type Href } from "expo-router";

export function to(path: string): Href {
  return path as Href;
}

export function push(path: string) {
  router.push(to(path));
}

export function replace(path: string) {
  router.replace(to(path));
}
