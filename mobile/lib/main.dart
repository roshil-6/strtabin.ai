import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'providers/app_state.dart';
import 'screens/app_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      systemNavigationBarColor: Color(0xFF0A0A0A),
      systemNavigationBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const StratabinApp());
}

class StratabinApp extends StatelessWidget {
  const StratabinApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Provider<AppState>(
      create: (_) => AppState(),
      child: MaterialApp(
        title: 'Stratabin',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          brightness: Brightness.dark,
          scaffoldBackgroundColor: const Color(0xFF050505),
          colorScheme: ColorScheme.dark(
            primary: const Color(0xFFF97316),
            surface: const Color(0xFF0A0A0A),
            onSurface: Colors.white,
            onSurfaceVariant: Colors.white70,
          ),
          textTheme: GoogleFonts.interTextTheme(
            ThemeData.dark().textTheme,
          ).copyWith(
            headlineMedium: GoogleFonts.inter(
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
            ),
            titleLarge: GoogleFonts.inter(
              fontWeight: FontWeight.w700,
            ),
          ),
          appBarTheme: AppBarTheme(
            backgroundColor: Colors.transparent,
            elevation: 0,
            centerTitle: true,
            titleTextStyle: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
            ),
          ),
          bottomNavigationBarTheme: const BottomNavigationBarThemeData(
            backgroundColor: Color(0xFF0E0E0E),
            selectedItemColor: Color(0xFFF97316),
            unselectedItemColor: Colors.white54,
            type: BottomNavigationBarType.fixed,
          ),
        ),
        home: const AppShell(),
      ),
    );
  }
}
