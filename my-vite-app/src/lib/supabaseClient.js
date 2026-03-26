// Deprecated compatibility module. Use:
// - ./supabaseParent for parent DB/auth access
// - ./authParent for parent auth helpers
//
// Kept as a thin re-export to avoid hard breakage while removing eager client boot side effects.
export { getSupabaseParent as getSupabase, purgeSupabaseStorage, PARENT_STORAGE_KEY } from "./supabaseParent";
export { signIn, signUp, signOutLocal as signOut, getUser, getSession, onAuthStateChange } from "./authParent";
