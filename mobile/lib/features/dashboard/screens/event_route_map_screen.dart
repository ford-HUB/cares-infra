import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';

import '../../../core/config/geoapify_config.dart';
import '../../../core/config/mapbox_config.dart';
import '../../../core/theme/app_theme.dart';
import '../data/event_route_service.dart';
import '../domain/cares_event.dart';

/// Map of the event venue with the walking route from the volunteer's
/// current position, so they can follow it to get there.
class EventRouteMapScreen extends StatefulWidget {
  const EventRouteMapScreen({super.key, required this.event});

  final CaresEvent event;

  static void open(BuildContext context, CaresEvent event) {
    Navigator.of(context).push(
      MaterialPageRoute<void>(
        builder: (_) => EventRouteMapScreen(event: event),
      ),
    );
  }

  @override
  State<EventRouteMapScreen> createState() => _EventRouteMapScreenState();
}

class _EventRouteMapScreenState extends State<EventRouteMapScreen> {
  final _mapController = MapController();
  final _routeService = EventRouteService();

  LatLng? _origin;
  EventRoute? _route;

  /// Basemap provider, demoted one step whenever the current one fails to
  /// serve tiles so the map never stays blank.
  _TileProvider _tiles = MapboxConfig.isConfigured
      ? _TileProvider.mapbox
      : GeoapifyConfig.isConfigured
      ? _TileProvider.geoapify
      : _TileProvider.osm;

  void _demoteTiles() {
    if (!mounted || _tiles == _TileProvider.osm) return;
    setState(() {
      _tiles = _tiles == _TileProvider.mapbox && GeoapifyConfig.isConfigured
          ? _TileProvider.geoapify
          : _TileProvider.osm;
    });
  }

  bool _loading = true;
  String? _error;

  LatLng get _venue =>
      LatLng(widget.event.venueLatitude, widget.event.venueLongitude);

  @override
  void initState() {
    super.initState();
    _loadRoute();
  }

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _loadRoute() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      if (!await Geolocator.isLocationServiceEnabled()) {
        throw const _RouteError(
          'Location services are turned off. Turn them on to see your route.',
        );
      }
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        throw const _RouteError(
          'Location permission is needed to draw the route from where you are.',
        );
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      final origin = LatLng(position.latitude, position.longitude);
      final route = await _routeService.walkingRoute(from: origin, to: _venue);
      if (!mounted) return;

      setState(() {
        _origin = origin;
        _route = route;
        _loading = false;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => _fitRoute());
    } on _RouteError catch (e) {
      if (mounted) {
        setState(() {
          _error = e.message;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _error = 'Unable to get your location. Please try again.';
          _loading = false;
        });
      }
    }
  }

  void _fitRoute() {
    final route = _route;
    if (route == null || !mounted) return;
    _mapController.fitCamera(
      CameraFit.bounds(
        bounds: LatLngBounds.fromPoints(route.points),
        padding: const EdgeInsets.fromLTRB(40, 120, 40, 220),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final event = widget.event;
    final route = _route;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
        title: const Text('Route to Venue'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
        actions: [
          IconButton(
            tooltip: 'Fit route',
            icon: const Icon(Icons.fit_screen_rounded),
            onPressed: route == null ? null : _fitRoute,
          ),
        ],
      ),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(initialCenter: _venue, initialZoom: 15),
            children: [
              TileLayer(
                key: ValueKey(_tiles),
                urlTemplate: switch (_tiles) {
                  _TileProvider.mapbox => MapboxConfig.tileUrlTemplate,
                  _TileProvider.geoapify => GeoapifyConfig.tileUrlTemplate,
                  _TileProvider.osm => GeoapifyConfig.osmTileUrlTemplate,
                },
                userAgentPackageName: 'com.caresinfra.mobile',
                errorTileCallback: (_, _, _) => _demoteTiles(),
              ),
              CircleLayer(
                circles: [
                  CircleMarker(
                    point: _venue,
                    radius: event.attendanceRadiusMeters,
                    useRadiusInMeter: true,
                    color: AppColors.primary.withValues(alpha: 0.12),
                    borderColor: AppColors.primary.withValues(alpha: 0.5),
                    borderStrokeWidth: 1.5,
                  ),
                ],
              ),
              if (route != null)
                PolylineLayer(
                  polylines: [
                    Polyline(
                      points: route.points,
                      strokeWidth: 5,
                      color: AppColors.primary,
                      pattern: route.isEstimate
                          ? const StrokePattern.dotted()
                          : const StrokePattern.solid(),
                    ),
                  ],
                ),
              MarkerLayer(
                markers: [
                  if (_origin != null)
                    Marker(
                      point: _origin!,
                      width: 24,
                      height: 24,
                      child: const _OriginDot(),
                    ),
                  Marker(
                    point: _venue,
                    width: 44,
                    height: 44,
                    alignment: Alignment.topCenter,
                    child: const Icon(
                      Icons.location_on_rounded,
                      size: 44,
                      color: AppColors.error,
                    ),
                  ),
                ],
              ),
              RichAttributionWidget(
                attributions: [
                  if (_tiles == _TileProvider.mapbox)
                    const TextSourceAttribution('Mapbox'),
                  if (_tiles == _TileProvider.geoapify)
                    const TextSourceAttribution('Geoapify'),
                  const TextSourceAttribution('OpenStreetMap contributors'),
                ],
              ),
            ],
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 16,
            child: SafeArea(
              top: false,
              child: _RouteSummaryCard(
                event: event,
                route: route,
                loading: _loading,
                error: _error,
                onRetry: _loadRoute,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

enum _TileProvider { mapbox, geoapify, osm }

class _RouteError implements Exception {
  const _RouteError(this.message);
  final String message;
}

class _OriginDot extends StatelessWidget {
  const _OriginDot();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF1E88E5),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white, width: 3),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.25), blurRadius: 6),
        ],
      ),
    );
  }
}

class _RouteSummaryCard extends StatelessWidget {
  const _RouteSummaryCard({
    required this.event,
    required this.route,
    required this.loading,
    required this.error,
    required this.onRetry,
  });

  final CaresEvent event;
  final EventRoute? route;
  final bool loading;
  final String? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.inputFill),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(
                Icons.location_on_outlined,
                size: 20,
                color: AppColors.primary,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  event.location,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: AppColors.textPrimary,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (loading)
            const Row(
              children: [
                SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 10),
                Text(
                  'Finding your route…',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            )
          else if (error != null)
            Row(
              children: [
                Expanded(
                  child: Text(
                    error!,
                    style: const TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: AppColors.error,
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                TextButton(onPressed: onRetry, child: const Text('Retry')),
              ],
            )
          else if (route != null) ...[
            Row(
              children: [
                _RouteStat(
                  icon: Icons.directions_walk_rounded,
                  value: route!.durationLabel,
                  label: 'walking',
                ),
                const SizedBox(width: 20),
                _RouteStat(
                  icon: Icons.straighten_rounded,
                  value: route!.distanceLabel,
                  label: 'distance',
                ),
              ],
            ),
            if (route!.isEstimate) ...[
              const SizedBox(height: 8),
              const Text(
                'Directions unavailable — showing a straight-line estimate.',
                style: TextStyle(fontSize: 12, color: AppColors.textMuted),
              ),
            ],
            const SizedBox(height: 8),
            Text(
              'Check in once you are within '
              '${event.attendanceRadiusMeters.round()}m of the venue.',
              style: const TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
        ],
      ),
    );
  }
}

class _RouteStat extends StatelessWidget {
  const _RouteStat({
    required this.icon,
    required this.value,
    required this.label,
  });

  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.primary),
        const SizedBox(width: 6),
        Text(
          value,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.w800,
            color: AppColors.textPrimary,
          ),
        ),
        const SizedBox(width: 4),
        Text(
          label,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
      ],
    );
  }
}
