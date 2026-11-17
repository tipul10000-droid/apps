// Taste profiles ("מה יש בנטפליקס?"). Hard-coded for now (Oren 17.11.2026): Oren and Lior send lists of what they
// liked / didn't, and Claude writes the profile here. A profile narrows the list; the filters still work inside it.
//   like:  coarse genres that fit (an item needs at least one of them; empty = all genres)
//   avoid: coarse genres that never fit (an item with any of them is out, unless its IMDb id is in boost)
//   boost: IMDb ids that are always in (titles they loved, or very close to them)
//   block: IMDb ids that are always out
//   pending: true = not built yet, shows everything with a short note
// Genre codes: act com dra rom thr scf hor doc ani fam rea
window.NF_TASTES = {
  oren: { name: "הטעם של אורן", icon: "🧔", pending: true, like: [], avoid: [], boost: [], block: [] },
  lior: { name: "הטעם של ליאור", icon: "👩", pending: true, like: [], avoid: [], boost: [], block: [] },
};
