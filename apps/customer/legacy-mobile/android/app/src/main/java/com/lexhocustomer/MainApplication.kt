package com.lexhocustomer

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Application
import android.os.Build
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    createNotificationChannels()
    loadReactNative(this)
  }

  private fun createNotificationChannels() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

    val notificationManager = getSystemService(NotificationManager::class.java)
    val defaultChannel = NotificationChannel(
      getString(R.string.default_notification_channel_id),
      getString(R.string.default_notification_channel_name),
      NotificationManager.IMPORTANCE_DEFAULT,
    ).apply {
      description = getString(R.string.default_notification_channel_description)
      enableVibration(true)
    }

    val bookingChannel = NotificationChannel(
      getString(R.string.booking_notification_channel_id),
      getString(R.string.booking_notification_channel_name),
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = getString(R.string.booking_notification_channel_description)
      enableVibration(true)
    }

    notificationManager.createNotificationChannels(listOf(defaultChannel, bookingChannel))
  }
}
