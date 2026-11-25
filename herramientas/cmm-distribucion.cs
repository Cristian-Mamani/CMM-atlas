using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;

internal static class CMMDistribucion
{
    private const string CMMEjecutable = "Atlas Anatomico CMM.exe";
    private const string CMMTitulo = "Atlas Anatómico CMM";

    [STAThread]
    public static int Main(string[] cmmArgumentos)
    {
        try
        {
            string cmmEjecutable = cmmPreparar();
            ProcessStartInfo cmmInicio = new ProcessStartInfo(cmmEjecutable);
            cmmInicio.WorkingDirectory = Path.GetDirectoryName(cmmEjecutable);
            cmmInicio.UseShellExecute = false;
            cmmInicio.Arguments = string.Join(" ", Array.ConvertAll(cmmArgumentos, cmmCitarArgumento));
            using (Process cmmProceso = Process.Start(cmmInicio))
            {
                cmmProceso.WaitForExit();
                return cmmProceso.ExitCode;
            }
        }
        catch (Exception cmmError)
        {
            MessageBox.Show("No se pudo iniciar el atlas.\n\n" + cmmError.Message,
                CMMTitulo, MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    private static string cmmCitarArgumento(string cmmArgumento)
    {
        return "\"" + Regex.Replace(cmmArgumento, "(\\\\*)(\"|$)", cmmCoincidencia =>
            cmmCoincidencia.Groups[1].Value + cmmCoincidencia.Groups[1].Value +
            (cmmCoincidencia.Groups[2].Value == "\"" ? "\\\"" : "")) + "\"";
    }

    private static string cmmPreparar()
    {
        Assembly cmmEnsamblado = Assembly.GetExecutingAssembly();
        string cmmIdentidad;
        using (StreamReader cmmLector = new StreamReader(cmmEnsamblado.GetManifestResourceStream("cmm-identidad")))
        {
            cmmIdentidad = cmmLector.ReadToEnd().Trim();
        }
        if (!Regex.IsMatch(cmmIdentidad, "^[0-9.]+-[0-9a-f]{16}$"))
            throw new InvalidDataException("La versión incluida en la descarga no es válida.");

        string cmmLocal = Environment.GetEnvironmentVariable("LOCALAPPDATA");
        if (string.IsNullOrWhiteSpace(cmmLocal))
            cmmLocal = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string cmmVersiones = Path.Combine(cmmLocal, "AtlasAnatomicoCMM", "versiones");
        string cmmVersion = Path.Combine(cmmVersiones, cmmIdentidad);
        Directory.CreateDirectory(cmmVersiones);

        using (Mutex cmmBloqueo = new Mutex(false, "AtlasAnatomicoCMM-" + cmmIdentidad))
        {
            try
            {
                if (!cmmBloqueo.WaitOne(TimeSpan.FromMinutes(3)))
                    throw new IOException("Otra ventana está preparando esta versión. Inténtalo de nuevo en un momento.");
            }
            catch (AbandonedMutexException)
            {
            }

            try
            {
                if (cmmCompleta(cmmVersion)) return Path.Combine(cmmVersion, CMMEjecutable);
                if (Directory.Exists(cmmVersion))
                    Directory.Move(cmmVersion, cmmVersion + ".incompleta-" + Guid.NewGuid().ToString("N"));
                string cmmProvisional = Path.Combine(cmmVersiones, ".preparando-" + Guid.NewGuid().ToString("N"));
                Directory.CreateDirectory(cmmProvisional);
                try
                {
                    using (Stream cmmPaquete = cmmEnsamblado.GetManifestResourceStream("cmm-aplicacion"))
                    using (ZipArchive cmmZip = new ZipArchive(cmmPaquete, ZipArchiveMode.Read))
                    {
                        cmmZip.ExtractToDirectory(cmmProvisional);
                    }
                    if (!cmmCompleta(cmmProvisional))
                        throw new InvalidDataException("La descarga contiene una copia incompleta del atlas.");
                    Directory.Move(cmmProvisional, cmmVersion);
                }
                finally
                {
                    if (Directory.Exists(cmmProvisional)) Directory.Delete(cmmProvisional, true);
                }
                return Path.Combine(cmmVersion, CMMEjecutable);
            }
            finally
            {
                cmmBloqueo.ReleaseMutex();
            }
        }
    }

    private static bool cmmCompleta(string cmmRuta)
    {
        return File.Exists(Path.Combine(cmmRuta, CMMEjecutable)) &&
            File.Exists(Path.Combine(cmmRuta, "resources", "app.asar"));
    }
}
