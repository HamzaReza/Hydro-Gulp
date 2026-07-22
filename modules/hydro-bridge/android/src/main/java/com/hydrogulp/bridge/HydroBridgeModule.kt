package com.hydrogulp.bridge

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class HydroBridgeModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context lost" }

  override fun definition() = ModuleDefinition {
    Name("HydroBridge")

    // Keeps the QS tile's cached numbers current so its label/subtitle are
    // correct even when the app process is dead.
    AsyncFunction("setTileState") { state: Map<String, Any?> ->
      val prefs = context.getSharedPreferences(TilePrefs.FILE, Context.MODE_PRIVATE)
      prefs.edit()
        .putInt(TilePrefs.KEY_TOTAL, (state["todayTotalMl"] as? Number)?.toInt() ?: 0)
        .putInt(TilePrefs.KEY_GOAL, (state["goalMl"] as? Number)?.toInt() ?: 2000)
        .putInt(TilePrefs.KEY_DEFAULT, (state["defaultAmountMl"] as? Number)?.toInt() ?: 250)
        .putString(TilePrefs.KEY_DATE, state["date"] as? String ?: "")
        .apply()
    }

    // Atomic read-and-clear of tile-tap logs (JSON array string).
    AsyncFunction("drainPendingLogs") {
      synchronized(TilePrefs.LOCK) {
        val prefs = context.getSharedPreferences(TilePrefs.FILE, Context.MODE_PRIVATE)
        val raw = prefs.getString(TilePrefs.KEY_QUEUE, "[]") ?: "[]"
        prefs.edit().remove(TilePrefs.KEY_QUEUE).apply()
        raw
      }
    }
  }
}
