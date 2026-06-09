export const manifest = {
  screens: {
    scr_t214e9: { name: "Landing", route: "/", position: { "x": 0, "y": 0 }, isDefaultRow: true },
    scr_bq9ypr: { name: "Student · Dashboard", route: "/student/dashboard", position: { "x": 160, "y": 1820 } },
    scr_wrhi02: { name: "Student · New Transfer", route: "/student/new-transfer", position: { "x": 1560, "y": 1820 } },
    scr_rkjr2k: { name: "Student · Request Detail", route: "/student/request/REQ-8821", position: { "x": 2960, "y": 1820 } },
    scr_y4zt07: { name: "Registrar · Dashboard", route: "/registrar/dashboard", position: { "x": 160, "y": 3800 } },
    scr_gedx1l: { name: "Registrar · Request Review", route: "/registrar/review/REQ-8821", position: { "x": 1560, "y": 3800 } },
    scr_d62i5w: { name: "Registrar · Issued Log", route: "/registrar/issued", position: { "x": 2960, "y": 3800 } },
    scr_jrtpyj: { name: "Verifier · Dashboard", route: "/verifier/dashboard", position: { "x": 160, "y": 5780 } },
    scr_19rrll: { name: "Verifier · History", route: "/verifier/history", position: { "x": 1560, "y": 5780 } },
    scr_ijbt6g: { name: "Admin · Member Institutions", route: "/admin/institutions", position: { "x": 160, "y": 7760 } },
    scr_pla10q: { name: "Admin · Network & Nodes", route: "/admin/network", position: { "x": 1560, "y": 7760 } },
    scr_7izn7j: { name: "Admin · Audit Log", route: "/admin/audit-log", position: { "x": 2960, "y": 7760 } }
  },
  sections: {
    sec_ehyvbx: { name: "Student flow", x: 0, y: 1600, width: 4320, height: 1180 },
    sec_3m7d70: { name: "Registrar flow", x: 0, y: 3580, width: 4320, height: 1180 },
    sec_vbs2hy: { name: "Verifier flow", x: 0, y: 5560, width: 2920, height: 1180 },
    sec_0qau5q: { name: "Admin flow", x: 0, y: 7540, width: 4320, height: 1180 }
  },
  layers: [
  { kind: "screen", id: "scr_t214e9" },
  { kind: "section", id: "sec_ehyvbx", children: [
    { kind: "screen", id: "scr_bq9ypr" },
    { kind: "screen", id: "scr_wrhi02" },
    { kind: "screen", id: "scr_rkjr2k" }]
  },
  { kind: "section", id: "sec_3m7d70", children: [
    { kind: "screen", id: "scr_y4zt07" },
    { kind: "screen", id: "scr_gedx1l" },
    { kind: "screen", id: "scr_d62i5w" }]
  },
  { kind: "section", id: "sec_vbs2hy", children: [
    { kind: "screen", id: "scr_jrtpyj" },
    { kind: "screen", id: "scr_19rrll" }]
  },
  { kind: "section", id: "sec_0qau5q", children: [
    { kind: "screen", id: "scr_ijbt6g" },
    { kind: "screen", id: "scr_pla10q" },
    { kind: "screen", id: "scr_7izn7j" }]
  }]

};