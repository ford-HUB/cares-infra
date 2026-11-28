import 'dart:async';
import 'dart:io';

import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:mobile/core/services/api_client.dart';

/// Each network change is DNS-probed against the API host, since an interface
/// is not internet. [isOnline] is null until the first probe.
class ConnectivityMonitor extends ChangeNotifier {
  ConnectivityMonitor._();

  static final ConnectivityMonitor instance = ConnectivityMonitor._();

  static const Duration probeTimeout = Duration(seconds: 4);

  final _connectivity = Connectivity();
  StreamSubscription<List<ConnectivityResult>>? _changes;
  bool? _isOnline;
  bool _started = false;
  Future<bool>? _inFlight;

  bool? get isOnline => _isOnline;

  bool get isConfirmedOnline => _isOnline == true;

  void start() {
    if (_started) return;
    _started = true;
    _changes = _connectivity.onConnectivityChanged.listen((results) {
      if (results.every((r) => r == ConnectivityResult.none)) {
        _set(false);
      } else {
        unawaited(probe());
      }
    });
    unawaited(probe());
  }

  void stop() {
    _changes?.cancel();
    _changes = null;
    _started = false;
  }

  /// Concurrent callers share one probe.
  Future<bool> probe() {
    final running = _inFlight;
    if (running != null) return running;
    final future = _probe().whenComplete(() => _inFlight = null);
    _inFlight = future;
    return future;
  }

  Future<bool> _probe() async {
    var online = false;
    try {
      final results = await _connectivity.checkConnectivity();
      if (!results.every((r) => r == ConnectivityResult.none)) {
        final host = _apiHost();
        if (host != null) {
          final addresses = await InternetAddress.lookup(
            host,
          ).timeout(probeTimeout);
          online = addresses.isNotEmpty;
        } else {
          // No API host configured (prototype .env) — trust the interface.
          online = true;
        }
      }
    } catch (_) {
      online = false;
    }
    _set(online);
    return online;
  }

  String? _apiHost() {
    try {
      final host = Uri.parse(ApiClient().baseUrl).host;
      if (host.isEmpty || host == 'localhost' || host == '127.0.0.1') {
        return null;
      }
      return host;
    } catch (_) {
      return null;
    }
  }

  void _set(bool online) {
    if (_isOnline == online) return;
    _isOnline = online;
    notifyListeners();
  }
}
