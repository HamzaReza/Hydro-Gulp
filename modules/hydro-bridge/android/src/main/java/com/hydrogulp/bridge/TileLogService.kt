package com.hydrogulp.bridge

import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Quick Settings tile: one tap queues the user's default preset as a pending
 * log (drained by the app on next open) and bumps the cached total — fully
 * functional with the app process dead. Everything shown is computed from
 * the SharedPreferences cache the JS side keeps fresh.
 */
class TileLogService : TileService() {

  override fun onStartListening() {
    super.onStartListening()
    refreshTile()
  }

  override fun onClick() {
    super.onClick()
    val prefs = getSharedPreferences(TilePrefs.FILE, MODE_PRIVATE)
    val today = localDate()
    val amount = prefs.getInt(TilePrefs.KEY_DEFAULT, 250)
    val sameDay = prefs.getString(TilePrefs.KEY_DATE, "") == today
    val currentTotal = if (sameDay) prefs.getInt(TilePrefs.KEY_TOTAL, 0) else 0

    synchronized(TilePrefs.LOCK) {
      val queue = JSONArray(prefs.getString(TilePrefs.KEY_QUEUE, "[]") ?: "[]")
      queue.put(
        JSONObject()
          .put("amountMl", amount)
          .put("type", "water")
          .put("timestampMs", System.currentTimeMillis())
          .put("date", today)
          .put("hydrationValueMl", amount) // water multiplier = 1.0
      )
      prefs.edit()
        .putString(TilePrefs.KEY_QUEUE, queue.toString())
        .putInt(TilePrefs.KEY_TOTAL, currentTotal + amount)
        .putString(TilePrefs.KEY_DATE, today)
        .apply()
    }
    refreshTile()
  }

  private fun refreshTile() {
    val tile = qsTile ?: return
    val prefs = getSharedPreferences(TilePrefs.FILE, MODE_PRIVATE)
    val today = localDate()
    val sameDay = prefs.getString(TilePrefs.KEY_DATE, "") == today
    val total = if (sameDay) prefs.getInt(TilePrefs.KEY_TOTAL, 0) else 0
    val goal = prefs.getInt(TilePrefs.KEY_GOAL, 2000).coerceAtLeast(1)
    val amount = prefs.getInt(TilePrefs.KEY_DEFAULT, 250)
    val pct = ((total * 100) / goal).coerceAtMost(999)

    tile.state = Tile.STATE_ACTIVE
    tile.label = "Log $amount ml"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      tile.subtitle = "$total / $goal · $pct%"
    }
    tile.updateTile()
  }

  private fun localDate(): String =
    SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
}
