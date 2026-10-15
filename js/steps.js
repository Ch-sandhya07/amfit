// Reads today's step total from the phone's own health store when AMFIT runs
// as the native app (Android Health Connect / iOS HealthKit). In a plain
// browser there is no access, so the app keeps manual entry.
(function () {
  const cap = window.Capacitor;
  const plugin = cap && cap.isNativePlatform && cap.isNativePlatform() && cap.Plugins && cap.Plugins.Health;

  function dayRange() {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return { startDate: start.toISOString(), endDate: new Date().toISOString() };
  }

  async function available() {
    if (!plugin) return false;
    try {
      const r = await plugin.isAvailable();
      return !!(r && r.available);
    } catch (e) {
      return false;
    }
  }

  async function connect() {
    if (!(await available())) throw new Error("Health data is not available on this phone. Install or update Health Connect (Android) or use an iPhone with Health.");
    await plugin.requestAuthorization({ read: ["steps"], write: [] });
  }

  // Aggregated totals are de-duplicated by the OS when a phone and a watch both
  // count the same walk; raw samples are only a fallback.
  async function todaySteps() {
    const range = dayRange();
    try {
      const r = await plugin.queryAggregated(Object.assign({ dataType: "steps", bucket: "day", aggregation: "sum" }, range));
      const rows = (r && (r.samples || r.data)) || [];
      if (rows.length) return Math.round(rows.reduce((a, x) => a + (Number(x.value) || 0), 0));
    } catch (e) { /* fall through to samples */ }
    const r = await plugin.readSamples(Object.assign({ dataType: "steps", limit: 1000 }, range));
    const rows = (r && r.samples) || [];
    return Math.round(rows.reduce((a, x) => a + (Number(x.value) || 0), 0));
  }

  window.AMFIT_STEPS = {
    native: !!plugin,
    platform: cap && cap.getPlatform ? cap.getPlatform() : "web",
    available: available,
    connect: connect,
    todaySteps: todaySteps
  };
})();
