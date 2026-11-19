window.AppStat && AppStat.init({ app: "trips", ver: "1", uid: function () { return new URLSearchParams(location.search).get("t") || null; } });
