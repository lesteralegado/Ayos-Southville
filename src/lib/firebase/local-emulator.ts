export const localEmulatorProject = "demo-ayos-southville-local";
export const localEmulatorHosts = { auth: "127.0.0.1:9099", firestore: "127.0.0.1:8080", storage: "127.0.0.1:9199" } as const;

export function assertLocalEmulatorServer(env: NodeJS.ProcessEnv) {
  const enabled = env.NEXT_PUBLIC_FIREBASE_EMULATORS === "true";
  const hosts = [env.FIREBASE_AUTH_EMULATOR_HOST, env.FIRESTORE_EMULATOR_HOST, env.FIREBASE_STORAGE_EMULATOR_HOST];
  if (!enabled && hosts.every(value => !value)) return false;
  if (!enabled || env.NODE_ENV === "production" || env.VERCEL || env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== localEmulatorProject || hosts[0] !== localEmulatorHosts.auth || hosts[1] !== localEmulatorHosts.firestore || hosts[2] !== localEmulatorHosts.storage || env.FIREBASE_STORAGE_BUCKET !== `${localEmulatorProject}.appspot.com`)
    throw new Error("Local emulator configuration must use the isolated demo project and all loopback services outside production.");
  return true;
}
