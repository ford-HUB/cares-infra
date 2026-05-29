import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/main.dart';

void main() {
  testWidgets('Skip welcome film and show login', (WidgetTester tester) async {
    await tester.pumpWidget(const CaresApp());
    await tester.pump();

    expect(find.text('Skip'), findsOneWidget);

    await tester.tap(find.text('Skip'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 800));

    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('CARES'), findsOneWidget);
  });
}
