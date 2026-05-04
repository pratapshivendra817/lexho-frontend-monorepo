$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Drawing

$source = @"
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;

public static class DarkAssetGenerator
{
    private static Color Hex(string value)
    {
        return ColorTranslator.FromHtml(value);
    }

    private static Graphics Prepare(Bitmap bitmap)
    {
        Graphics g = Graphics.FromImage(bitmap);
        g.SmoothingMode = SmoothingMode.AntiAlias;
        g.InterpolationMode = InterpolationMode.HighQualityBicubic;
        g.PixelOffsetMode = PixelOffsetMode.HighQuality;
        g.CompositingQuality = CompositingQuality.HighQuality;
        return g;
    }

    private static void FillBackground(Graphics g, Rectangle rect, string top, string bottom)
    {
        using (LinearGradientBrush brush = new LinearGradientBrush(rect, Hex(top), Hex(bottom), 90f))
        {
            g.FillRectangle(brush, rect);
        }
    }

    private static void AddGlow(Graphics g, RectangleF bounds, string color, int alpha)
    {
        using (SolidBrush brush = new SolidBrush(Color.FromArgb(alpha, Hex(color))))
        {
            g.FillEllipse(brush, bounds);
        }
    }

    private static void FillRoundedPanel(Graphics g, Rectangle rect)
    {
        using (GraphicsPath panel = RoundedRect(rect, 48))
        using (LinearGradientBrush brush = new LinearGradientBrush(rect, Hex("#1C2434"), Hex("#111827"), 90f))
        using (Pen outline = new Pen(Color.FromArgb(90, Hex("#E2E8F0")), 2f))
        {
            g.FillPath(brush, panel);
            g.DrawPath(outline, panel);
        }

        Rectangle inner = new Rectangle(rect.X + 10, rect.Y + 10, rect.Width - 20, rect.Height - 20);
        using (GraphicsPath innerPanel = RoundedRect(inner, 40))
        using (Pen innerOutline = new Pen(Color.FromArgb(24, Hex("#FFFFFF")), 1f))
        {
            g.DrawPath(innerOutline, innerPanel);
        }
    }

    private static void AddCornerHighlights(Graphics g)
    {
        using (LinearGradientBrush topGlow = new LinearGradientBrush(
            new Rectangle(90, 80, 1020, 150),
            Color.FromArgb(34, Hex("#FFFFFF")),
            Color.FromArgb(0, Hex("#FFFFFF")),
            90f))
        {
            g.FillEllipse(topGlow, 130, 86, 720, 120);
        }

        using (LinearGradientBrush bottomGlow = new LinearGradientBrush(
            new Rectangle(120, 650, 980, 120),
            Color.FromArgb(0, Hex("#FFFFFF")),
            Color.FromArgb(18, Hex("#93C5FD")),
            90f))
        {
            g.FillEllipse(bottomGlow, 260, 676, 560, 76);
        }
    }

    private static GraphicsPath RoundedRect(Rectangle rect, int radius)
    {
        int d = radius * 2;
        GraphicsPath path = new GraphicsPath();
        path.AddArc(rect.X, rect.Y, d, d, 180, 90);
        path.AddArc(rect.Right - d, rect.Y, d, d, 270, 90);
        path.AddArc(rect.Right - d, rect.Bottom - d, d, d, 0, 90);
        path.AddArc(rect.X, rect.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    public static void DrawCleaning(string path)
    {
        using (Bitmap bitmap = new Bitmap(1200, 900))
        using (Graphics g = Prepare(bitmap))
        {
            Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            FillBackground(g, rect, "#081120", "#0F172A");
            AddGlow(g, new RectangleF(126, 138, 430, 430), "#2DD4BF", 34);
            AddGlow(g, new RectangleF(730, 190, 270, 270), "#F59E0B", 20);
            AddGlow(g, new RectangleF(790, 520, 180, 100), "#38BDF8", 18);
            FillRoundedPanel(g, new Rectangle(72, 72, 1056, 756));
            AddCornerHighlights(g);

            using (LinearGradientBrush floorBrush = new LinearGradientBrush(new Rectangle(0, 610, 1200, 120), Hex("#0B1324"), Hex("#050B16"), 90f))
            using (LinearGradientBrush bottleBody = new LinearGradientBrush(new Rectangle(340, 248, 220, 340), Hex("#2DD4BF"), Hex("#0F766E"), 90f))
            using (SolidBrush bottleDark = new SolidBrush(Hex("#115E59")))
            using (SolidBrush bottleTop = new SolidBrush(Hex("#E2E8F0")))
            using (SolidBrush trigger = new SolidBrush(Hex("#F8FAFC")))
            using (SolidBrush windowBrush = new SolidBrush(Color.FromArgb(92, Hex("#D5FFFB"))))
            using (SolidBrush bubbleBrush = new SolidBrush(Color.FromArgb(110, Hex("#D8F3FF"))))
            using (SolidBrush accentBrush = new SolidBrush(Hex("#FCD34D")))
            using (SolidBrush clothBrush = new SolidBrush(Hex("#FB923C")))
            using (Pen shine = new Pen(Color.FromArgb(74, Hex("#FFFFFF")), 10f))
            {
                g.FillEllipse(floorBrush, 240, 624, 720, 108);

                using (GraphicsPath bodyPath = RoundedRect(new Rectangle(340, 250, 220, 340), 68))
                {
                    g.FillPath(bottleBody, bodyPath);
                }
                g.DrawArc(shine, 368, 296, 74, 172, 180, 106);
                g.FillRectangle(bottleDark, 424, 186, 76, 78);
                g.FillEllipse(trigger, 436, 134, 160, 98);
                g.FillRectangle(trigger, 492, 164, 118, 28);
                g.FillRectangle(bottleTop, 404, 204, 132, 26);
                using (GraphicsPath innerPath = RoundedRect(new Rectangle(392, 334, 116, 138), 38))
                {
                    g.FillPath(windowBrush, innerPath);
                }
                g.FillEllipse(accentBrush, 515, 304, 74, 74);

                Point[] cloth =
                {
                    new Point(650, 520),
                    new Point(800, 452),
                    new Point(874, 542),
                    new Point(756, 626),
                    new Point(620, 588),
                };
                g.FillPolygon(clothBrush, cloth);
                using (Pen clothEdge = new Pen(Color.FromArgb(34, Hex("#FFFFFF")), 3f))
                {
                    g.DrawLines(clothEdge, new Point[] { cloth[0], cloth[1], cloth[2], cloth[3], cloth[4], cloth[0] });
                }

                int[,] bubbles =
                {
                    { 776, 224, 64 },
                    { 866, 188, 40 },
                    { 946, 250, 34 },
                    { 858, 318, 24 },
                    { 990, 356, 48 }
                };

                for (int i = 0; i < bubbles.GetLength(0); i++)
                {
                    int x = bubbles[i, 0];
                    int y = bubbles[i, 1];
                    int size = bubbles[i, 2];
                    g.FillEllipse(bubbleBrush, x, y, size, size);
                    using (Pen ring = new Pen(Color.FromArgb(120, Hex("#FFFFFF")), 3f))
                    {
                        g.DrawEllipse(ring, x + 8, y + 8, size - 16, size - 16);
                    }
                }
            }

            bitmap.Save(path, ImageFormat.Png);
        }
    }

    public static void DrawParty(string path)
    {
        using (Bitmap bitmap = new Bitmap(1200, 900))
        using (Graphics g = Prepare(bitmap))
        {
            Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            FillBackground(g, rect, "#081120", "#111827");
            AddGlow(g, new RectangleF(170, 120, 340, 340), "#F472B6", 24);
            AddGlow(g, new RectangleF(748, 150, 280, 280), "#A78BFA", 22);
            AddGlow(g, new RectangleF(455, 590, 280, 100), "#6366F1", 18);
            FillRoundedPanel(g, new Rectangle(72, 72, 1056, 756));
            AddCornerHighlights(g);

            using (LinearGradientBrush tableBrush = new LinearGradientBrush(new Rectangle(0, 640, 1200, 120), Hex("#241B58"), Hex("#15113A"), 90f))
            using (SolidBrush cakeBrush = new SolidBrush(Hex("#FFF7FB")))
            using (LinearGradientBrush icingBrush = new LinearGradientBrush(new Rectangle(448, 252, 304, 74), Hex("#F9CFE8"), Hex("#F3B3D7"), 90f))
            using (LinearGradientBrush baseBrush = new LinearGradientBrush(new Rectangle(448, 332, 304, 144), Hex("#FB7185"), Hex("#F43F5E"), 90f))
            using (SolidBrush candleBrush = new SolidBrush(Hex("#FDE68A")))
            using (SolidBrush flameBrush = new SolidBrush(Hex("#F59E0B")))
            using (LinearGradientBrush standBrush = new LinearGradientBrush(new Rectangle(390, 460, 420, 150), Hex("#A78BFA"), Hex("#8B5CF6"), 90f))
            using (SolidBrush confettiPink = new SolidBrush(Hex("#F472B6")))
            using (SolidBrush confettiBlue = new SolidBrush(Hex("#60A5FA")))
            using (SolidBrush confettiGold = new SolidBrush(Hex("#FBBF24")))
            using (Pen ribbon = new Pen(Color.FromArgb(150, Hex("#CBD5E1")), 5f))
            using (Pen frostingShine = new Pen(Color.FromArgb(60, Hex("#FFFFFF")), 5f))
            {
                g.FillEllipse(tableBrush, 240, 646, 720, 108);
                g.FillEllipse(standBrush, 392, 544, 416, 56);
                g.FillRectangle(standBrush, 570, 474, 60, 90);
                g.FillEllipse(standBrush, 486, 432, 228, 72);
                g.FillRectangle(baseBrush, 448, 332, 304, 144);
                g.FillRectangle(cakeBrush, 470, 268, 260, 92);
                g.FillEllipse(icingBrush, 448, 246, 304, 72);
                g.DrawArc(frostingShine, 500, 264, 164, 36, 200, 120);
                g.FillEllipse(icingBrush, 438, 318, 46, 54);
                g.FillEllipse(icingBrush, 516, 330, 46, 54);
                g.FillEllipse(icingBrush, 594, 328, 46, 54);
                g.FillEllipse(icingBrush, 672, 316, 46, 54);

                int[] candleXs = { 528, 600, 672 };
                foreach (int x in candleXs)
                {
                    g.FillRectangle(candleBrush, x, 176, 14, 84);
                    g.FillEllipse(flameBrush, x - 8, 138, 30, 44);
                }

                Point[] bunting1 =
                {
                    new Point(244, 180), new Point(322, 244), new Point(400, 180),
                    new Point(478, 244), new Point(556, 180), new Point(634, 244),
                    new Point(712, 180), new Point(790, 244), new Point(868, 180)
                };
                g.DrawCurve(ribbon, bunting1);

                Point[][] flags =
                {
                    new [] { new Point(312, 204), new Point(348, 204), new Point(330, 246) },
                    new [] { new Point(470, 204), new Point(506, 204), new Point(488, 246) },
                    new [] { new Point(628, 204), new Point(664, 204), new Point(646, 246) },
                    new [] { new Point(786, 204), new Point(822, 204), new Point(804, 246) }
                };
                Brush[] flagBrushes = { confettiPink, confettiBlue, confettiGold, confettiPink };
                for (int i = 0; i < flags.Length; i++)
                {
                    g.FillPolygon(flagBrushes[i], flags[i]);
                }

                Rectangle[] confetti =
                {
                    new Rectangle(242, 320, 14, 44),
                    new Rectangle(940, 292, 14, 44),
                    new Rectangle(324, 388, 14, 44),
                    new Rectangle(866, 388, 14, 44),
                    new Rectangle(194, 242, 14, 44),
                    new Rectangle(996, 242, 14, 44),
                };
                Brush[] confettiBrushes = { confettiPink, confettiBlue, confettiGold, confettiBlue, confettiGold, confettiPink };
                for (int i = 0; i < confetti.Length; i++)
                {
                    g.TranslateTransform(confetti[i].X + confetti[i].Width / 2f, confetti[i].Y + confetti[i].Height / 2f);
                    g.RotateTransform((i % 2 == 0) ? -24f : 18f);
                    g.FillRectangle(confettiBrushes[i], -confetti[i].Width / 2f, -confetti[i].Height / 2f, confetti[i].Width, confetti[i].Height);
                    g.ResetTransform();
                }
            }

            bitmap.Save(path, ImageFormat.Png);
        }
    }

    public static void DrawThai(string path)
    {
        using (Bitmap bitmap = new Bitmap(1200, 900))
        using (Graphics g = Prepare(bitmap))
        {
            Rectangle rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            FillBackground(g, rect, "#07101F", "#0F172A");
            AddGlow(g, new RectangleF(182, 142, 320, 320), "#FB923C", 24);
            AddGlow(g, new RectangleF(760, 126, 250, 250), "#34D399", 20);
            AddGlow(g, new RectangleF(430, 620, 320, 86), "#475569", 16);
            FillRoundedPanel(g, new Rectangle(72, 72, 1056, 756));
            AddCornerHighlights(g);

            using (SolidBrush plateShadow = new SolidBrush(Color.FromArgb(90, Hex("#020617"))))
            using (LinearGradientBrush bowlOuter = new LinearGradientBrush(new Rectangle(320, 300, 560, 260), Hex("#FB923C"), Hex("#EA580C"), 90f))
            using (SolidBrush bowlInner = new SolidBrush(Hex("#FFF7ED")))
            using (LinearGradientBrush soup = new LinearGradientBrush(new Rectangle(378, 308, 444, 150), Hex("#FB923C"), Hex("#F97316"), 90f))
            using (Pen noodle = new Pen(Hex("#FDE68A"), 9f))
            using (SolidBrush herb = new SolidBrush(Hex("#34D399")))
            using (SolidBrush lime = new SolidBrush(Hex("#A3E635")))
            using (SolidBrush chili = new SolidBrush(Hex("#F43F5E")))
            using (Pen chopstick = new Pen(Hex("#C08457"), 12f))
            using (Pen soupShine = new Pen(Color.FromArgb(64, Hex("#FFF7ED")), 4f))
            {
                g.FillEllipse(plateShadow, 310, 598, 580, 92);
                g.FillEllipse(bowlOuter, 320, 304, 560, 260);
                g.FillEllipse(bowlInner, 360, 274, 480, 206);
                g.FillEllipse(soup, 382, 310, 436, 144);
                g.DrawArc(soupShine, 430, 322, 180, 40, 200, 120);

                g.DrawBezier(noodle, new Point(446, 372), new Point(510, 328), new Point(570, 396), new Point(636, 348));
                g.DrawBezier(noodle, new Point(478, 414), new Point(536, 362), new Point(620, 420), new Point(694, 352));
                g.DrawBezier(noodle, new Point(430, 340), new Point(504, 300), new Point(624, 376), new Point(736, 326));

                g.FillEllipse(herb, 448, 330, 72, 38);
                g.FillEllipse(herb, 500, 372, 78, 42);
                g.FillEllipse(herb, 626, 344, 82, 42);
                g.FillEllipse(lime, 706, 316, 78, 78);
                g.FillEllipse(chili, 602, 398, 92, 18);
                g.FillEllipse(chili, 560, 346, 74, 16);

                g.DrawLine(chopstick, 666, 180, 858, 314);
                g.DrawLine(chopstick, 628, 214, 820, 348);
            }

            bitmap.Save(path, ImageFormat.Png);
        }
    }
}
"@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing

$root = Get-Location
$targets = @(
  @{ Path = 'assets/images/services/cleaning-dark-1.png'; Kind = 'Cleaning' },
  @{ Path = 'assets/images/party/birthday-dark.png'; Kind = 'Party' },
  @{ Path = 'assets/images/cuisine/thai-dark.png'; Kind = 'Thai' }
)

foreach ($target in $targets) {
  $fullPath = Join-Path $root $target.Path
  $dir = Split-Path -Parent $fullPath
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
  }

  switch ($target.Kind) {
    'Cleaning' { [DarkAssetGenerator]::DrawCleaning($fullPath) }
    'Party' { [DarkAssetGenerator]::DrawParty($fullPath) }
    'Thai' { [DarkAssetGenerator]::DrawThai($fullPath) }
  }
}
