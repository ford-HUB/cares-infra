import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/geoapify_config.dart';
import '../../../core/config/mapbox_config.dart';
import '../../../core/constants/cares_office.dart';
import '../../../core/theme/app_theme.dart';

/// Map pieces for where assistance is needed: the form's pin field, the
/// full-screen pin picker it opens, and the read-only map on the details
/// screen.

String formatLatLng(LatLng point) =>
    '${point.latitude.toStringAsFixed(5)}, '
    '${point.longitude.toStringAsFixed(5)}';

/// The device's position, or a [LocationLookupException] whose message can
/// be shown as-is.
Future<LatLng> currentDeviceLocation() async {
  if (!await Geolocator.isLocationServiceEnabled()) {
    throw const LocationLookupException(
      'Location services are turned off. Turn them on, or tap the map to '
      'pin the location yourself.',
    );
  }
  var permission = await Geolocator.checkPermission();
  if (permission == LocationPermission.denied) {
    permission = await Geolocator.requestPermission();
  }
  if (permission == LocationPermission.denied ||
      permission == LocationPermission.deniedForever) {
    throw const LocationLookupException(
      'Location permission is needed to use your current location. You can '
      'still tap the map to pin it.',
    );
  }
  try {
    final position = await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        timeLimit: Duration(seconds: 20),
      ),
    );
    return LatLng(position.latitude, position.longitude);
  } catch (_) {
    throw const LocationLookupException(
      'Could not get your current location. Tap the map to pin it instead.',
    );
  }
}

class LocationLookupException implements Exception {
  const LocationLookupException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Basemap that steps down Mapbox → Geoapify → OpenStreetMap whenever the
/// current provider fails to serve tiles, so the map never stays blank.
class _FallbackTileLayer extends StatefulWidget {
  const _FallbackTileLayer();

  @override
  State<_FallbackTileLayer> createState() => _FallbackTileLayerState();
}

enum _Tiles { mapbox, geoapify, osm }

class _FallbackTileLayerState extends State<_FallbackTileLayer> {
  _Tiles _tiles = MapboxConfig.isConfigured
      ? _Tiles.mapbox
      : GeoapifyConfig.isConfigured
      ? _Tiles.geoapify
      : _Tiles.osm;

  void _demote() {
    if (!mounted || _tiles == _Tiles.osm) return;
    setState(() {
      _tiles = _tiles == _Tiles.mapbox && GeoapifyConfig.isConfigured
          ? _Tiles.geoapify
          : _Tiles.osm;
    });
  }

  @override
  Widget build(BuildContext context) {
    return TileLayer(
      key: ValueKey(_tiles),
      urlTemplate: switch (_tiles) {
        _Tiles.mapbox => MapboxConfig.tileUrlTemplate,
        _Tiles.geoapify => GeoapifyConfig.tileUrlTemplate,
        _Tiles.osm => GeoapifyConfig.osmTileUrlTemplate,
      },
      userAgentPackageName: 'com.caresinfra.mobile',
      errorTileCallback: (_, _, _) => _demote(),
    );
  }
}

const double _pinSize = 44;

/// Red drop pin whose tip sits on the point.
Marker _pinMarker(LatLng point) => Marker(
  point: point,
  width: _pinSize,
  height: _pinSize,
  alignment: Alignment.topCenter,
  child: const Icon(
    Icons.location_on_rounded,
    size: _pinSize,
    color: AppColors.heart,
  ),
);

/// The form's "Where is assistance needed?" section: a map the beneficiary
/// taps to drop a pin, their current location in one tap, a full-screen
/// picker for fine placement, and a landmark field.
class AssistanceLocationField extends StatefulWidget {
  const AssistanceLocationField({
    super.key,
    required this.location,
    required this.onChanged,
    required this.detailsController,
  });

  final LatLng? location;
  final ValueChanged<LatLng?> onChanged;
  final TextEditingController detailsController;

  @override
  State<AssistanceLocationField> createState() =>
      _AssistanceLocationFieldState();
}

class _AssistanceLocationFieldState extends State<AssistanceLocationField> {
  final _mapController = MapController();
  bool _locating = false;

  static const double _pinnedZoom = 16;

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  void _pin(LatLng point, {bool recenter = false}) {
    widget.onChanged(point);
    if (recenter) {
      _mapController.move(
        point,
        _mapController.camera.zoom < _pinnedZoom
            ? _pinnedZoom
            : _mapController.camera.zoom,
      );
    }
  }

  Future<void> _useCurrentLocation() async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      final point = await currentDeviceLocation();
      if (!mounted) return;
      _pin(point, recenter: true);
    } on LocationLookupException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  Future<void> _openFullMap() async {
    final point = await AssistanceLocationPickerScreen.open(
      context,
      initial: widget.location ?? _mapController.camera.center,
    );
    if (point == null || !mounted) return;
    _pin(point, recenter: true);
  }

  @override
  Widget build(BuildContext context) {
    final location = widget.location;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(14),
          child: Container(
            height: 220,
            decoration: BoxDecoration(
              border: Border.all(color: AppColors.inputFill),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: location ?? CaresOffice.location,
                    initialZoom: location == null ? 13 : _pinnedZoom,
                    // Dragging would fight the form's scrolling, so the
                    // inline map pins on tap and zooms; panning is in the
                    // full-screen picker.
                    interactionOptions: const InteractionOptions(
                      flags:
                          InteractiveFlag.pinchZoom |
                          InteractiveFlag.doubleTapZoom,
                    ),
                    onTap: (_, point) => _pin(point),
                  ),
                  children: [
                    const _FallbackTileLayer(),
                    if (location != null)
                      MarkerLayer(markers: [_pinMarker(location)]),
                  ],
                ),
                Positioned(
                  top: 8,
                  right: 8,
                  child: _MapIconButton(
                    icon: Icons.open_in_full_rounded,
                    tooltip: 'Open full map',
                    onTap: _openFullMap,
                  ),
                ),
                if (location == null)
                  Positioned(
                    left: 10,
                    right: 56,
                    top: 10,
                    child: _MapHint(
                      text: 'Tap the map to pin where help is needed',
                    ),
                  ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: Text(
                location == null
                    ? 'No location pinned yet'
                    : 'Pinned at ${formatLatLng(location)}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: location == null
                      ? AppColors.textMuted
                      : AppColors.textSecondary,
                ),
              ),
            ),
            if (location != null)
              TextButton(
                onPressed: () => widget.onChanged(null),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.textMuted,
                  visualDensity: VisualDensity.compact,
                ),
                child: const Text('Remove pin'),
              ),
          ],
        ),
        const SizedBox(height: 4),
        OutlinedButton.icon(
          onPressed: _locating ? null : _useCurrentLocation,
          icon: _locating
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.my_location_rounded, size: 18),
          label: Text(_locating ? 'Locating...' : 'Use my current location'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primaryDark,
            side: const BorderSide(color: AppColors.borderActive, width: 1.2),
            minimumSize: const Size.fromHeight(46),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const SizedBox(height: 10),
        TextField(
          controller: widget.detailsController,
          maxLength: 200,
          textCapitalization: TextCapitalization.sentences,
          decoration: InputDecoration(
            hintText: 'Landmark or address details (optional)',
            prefixIcon: const Icon(
              Icons.signpost_outlined,
              color: AppColors.textMuted,
            ),
            filled: true,
            fillColor: AppColors.surface,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.inputFill),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.inputFill),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: const BorderSide(color: AppColors.primary),
            ),
          ),
        ),
      ],
    );
  }
}

/// Full-screen picker: the pin stays in the middle while the beneficiary
/// pans the map under it. Returns the chosen point, or null when backed out.
class AssistanceLocationPickerScreen extends StatefulWidget {
  const AssistanceLocationPickerScreen({super.key, required this.initial});

  final LatLng initial;

  static Future<LatLng?> open(BuildContext context, {required LatLng initial}) {
    return Navigator.of(context).push<LatLng>(
      MaterialPageRoute<LatLng>(
        builder: (_) => AssistanceLocationPickerScreen(initial: initial),
      ),
    );
  }

  @override
  State<AssistanceLocationPickerScreen> createState() =>
      _AssistanceLocationPickerScreenState();
}

class _AssistanceLocationPickerScreenState
    extends State<AssistanceLocationPickerScreen> {
  final _mapController = MapController();
  late LatLng _center = widget.initial;
  bool _locating = false;

  @override
  void dispose() {
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _goToCurrentLocation() async {
    if (_locating) return;
    setState(() => _locating = true);
    try {
      final point = await currentDeviceLocation();
      if (!mounted) return;
      _mapController.move(point, 17);
      setState(() => _center = point);
    } on LocationLookupException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Pin the location'),
        centerTitle: true,
        backgroundColor: AppColors.background,
        foregroundColor: AppColors.textPrimary,
        elevation: 0,
      ),
      body: Column(
        children: [
          Expanded(
            child: Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: widget.initial,
                    initialZoom: 16,
                    interactionOptions: const InteractionOptions(
                      flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                    ),
                    onPositionChanged: (camera, _) =>
                        setState(() => _center = camera.center),
                  ),
                  children: const [_FallbackTileLayer()],
                ),
                // Lifted by half its height so the tip marks the centre.
                IgnorePointer(
                  child: Center(
                    child: Transform.translate(
                      offset: const Offset(0, -_pinSize / 2),
                      child: const Icon(
                        Icons.location_on_rounded,
                        size: _pinSize,
                        color: AppColors.heart,
                      ),
                    ),
                  ),
                ),
                const Positioned(
                  left: 12,
                  right: 12,
                  top: 12,
                  child: _MapHint(
                    text: 'Move the map so the pin sits where help is needed',
                  ),
                ),
                Positioned(
                  right: 12,
                  bottom: 12,
                  child: FloatingActionButton.small(
                    heroTag: null,
                    onPressed: _locating ? null : _goToCurrentLocation,
                    backgroundColor: AppColors.surface,
                    foregroundColor: AppColors.primaryDark,
                    tooltip: 'Use my current location',
                    child: _locating
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.my_location_rounded),
                  ),
                ),
              ],
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    formatLatLng(_center),
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton.icon(
                    onPressed: () => Navigator.of(context).pop(_center),
                    icon: const Icon(Icons.check_rounded),
                    label: const Text('Confirm this location'),
                    style: FilledButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      minimumSize: const Size.fromHeight(52),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(14),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Read-only map of a filed request's pin, with a hand-off to the device's
/// maps app for directions.
class AssistanceLocationPreview extends StatelessWidget {
  const AssistanceLocationPreview({
    super.key,
    required this.location,
    this.details,
  });

  final LatLng location;
  final String? details;

  Future<void> _openInMaps(BuildContext context) async {
    final uri = Uri.https('www.google.com', '/maps/search/', {
      'api': '1',
      'query': '${location.latitude},${location.longitude}',
    });
    final opened = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!opened && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Could not open a maps app.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final details = this.details;

    return Container(
      decoration: AppDecorations.surfaceCard(),
      clipBehavior: Clip.antiAlias,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          SizedBox(
            height: 180,
            child: FlutterMap(
              options: MapOptions(
                initialCenter: location,
                initialZoom: 16,
                interactionOptions: const InteractionOptions(
                  flags: InteractiveFlag.none,
                ),
              ),
              children: [
                const _FallbackTileLayer(),
                MarkerLayer(markers: [_pinMarker(location)]),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 12),
            child: Row(
              children: [
                const Icon(
                  Icons.location_on_outlined,
                  size: 18,
                  color: AppColors.textMuted,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (details != null && details.isNotEmpty) ...[
                        Text(
                          details,
                          style: const TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                      ],
                      Text(
                        formatLatLng(location),
                        style: const TextStyle(
                          fontSize: 12,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
                TextButton(
                  onPressed: () => _openInMaps(context),
                  child: const Text('Open in Maps'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _MapIconButton extends StatelessWidget {
  const _MapIconButton({
    required this.icon,
    required this.tooltip,
    required this.onTap,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: AppColors.surface,
      shape: const CircleBorder(),
      elevation: 2,
      child: IconButton(
        onPressed: onTap,
        tooltip: tooltip,
        visualDensity: VisualDensity.compact,
        icon: Icon(icon, size: 18, color: AppColors.primaryDark),
      ),
    );
  }
}

class _MapHint extends StatelessWidget {
  const _MapHint({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppColors.surface.withValues(alpha: 0.94),
        borderRadius: BorderRadius.circular(10),
        boxShadow: const [BoxShadow(color: Color(0x22000000), blurRadius: 6)],
      ),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: AppColors.textSecondary,
        ),
      ),
    );
  }
}
