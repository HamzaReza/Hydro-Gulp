package com.hydrogulp.bridge

/**
 * SharedPreferences contract shared by the Expo module (JS writes tile state,
 * drains the queue) and the TileService (reads state, appends taps).
 */
object TilePrefs {
  const val FILE = "hydro_tile"
  const val KEY_TOTAL = "todayTotalMl"
  const val KEY_GOAL = "goalMl"
  const val KEY_DEFAULT = "defaultAmountMl"
  const val KEY_DATE = "date"
  const val KEY_QUEUE = "pendingLogs"

  /** Guards read-modify-write cycles on KEY_QUEUE across module + service. */
  val LOCK = Any()
}
