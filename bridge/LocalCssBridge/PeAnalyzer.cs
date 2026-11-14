using System.Reflection.PortableExecutable;
using System.Text;

namespace LocalCssBridge;

internal static class PeAnalyzer
{
    private const int MaxDirectoryEntries = 4096;
    private const int MaxNameBytes = 512;

    public static void Analyze(string path, FileRecord record)
    {
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            using var reader = new PEReader(stream, PEStreamOptions.LeaveOpen);
            var headers = reader.PEHeaders;
            record.PeArchitecture = (ushort)headers.CoffHeader.Machine switch
            {
                0x014c => "x86",
                0x8664 => "x64",
                0x01c0 or 0x01c4 => "ARM",
                0xaa64 => "ARM64",
                0x0200 => "IA64",
                _ => $"Unknown(0x{(ushort)headers.CoffHeader.Machine:X4})"
            };
            record.PeSubsystem = headers.PEHeader?.Subsystem.ToString();
            record.PeIsDll = (headers.CoffHeader.Characteristics & Characteristics.Dll) != 0;
            var sections = headers.SectionHeaders;
            var importRva = headers.PEHeader?.ImportTableDirectory.RelativeVirtualAddress ?? 0;
            if (importRva != 0)
                record.PeImports = ReadImportNames(stream, sections, importRva);
            var exportRva = headers.PEHeader?.ExportTableDirectory.RelativeVirtualAddress ?? 0;
            if (exportRva != 0)
                record.PeExportCount = ReadExportCount(stream, sections, exportRva);
            record.PeAnalysisStatus = "analyzed";
        }
        catch (BadImageFormatException) { record.PeAnalysisStatus = "not_pe_or_invalid"; }
        catch (Exception ex) { record.PeAnalysisStatus = "error:" + ex.GetType().Name; }
    }

    private static List<string> ReadImportNames(FileStream stream, System.Collections.Immutable.ImmutableArray<System.Reflection.PortableExecutable.SectionHeader> sections, int rva)
    {
        var result = new List<string>();
        var offset = RvaToOffset(sections, rva);
        if (offset < 0) return result;
        using var reader = new BinaryReader(stream, Encoding.ASCII, leaveOpen: true);
        for (var i = 0; i < MaxDirectoryEntries; i++)
        {
            stream.Position = offset + i * 20L;
            if (stream.Position + 20 > stream.Length) break;
            var originalThunk = reader.ReadUInt32();
            reader.ReadUInt32(); reader.ReadUInt32();
            var nameRva = reader.ReadUInt32();
            reader.ReadUInt32();
            if (originalThunk == 0 && nameRva == 0) break;
            var nameOffset = RvaToOffset(sections, checked((int)nameRva));
            if (nameOffset < 0) continue;
            var name = ReadAsciiZ(stream, nameOffset);
            if (!string.IsNullOrWhiteSpace(name)) result.Add(name);
        }
        return result.Distinct(StringComparer.OrdinalIgnoreCase).Take(256).ToList();
    }

    private static int ReadExportCount(FileStream stream, System.Collections.Immutable.ImmutableArray<System.Reflection.PortableExecutable.SectionHeader> sections, int rva)
    {
        var offset = RvaToOffset(sections, rva);
        if (offset < 0 || offset + 40 > stream.Length) return 0;
        using var reader = new BinaryReader(stream, Encoding.ASCII, leaveOpen: true);
        stream.Position = offset + 20;
        var count = reader.ReadUInt32();
        return (int)Math.Min(count, 100000);
    }

    private static int RvaToOffset(System.Collections.Immutable.ImmutableArray<System.Reflection.PortableExecutable.SectionHeader> sections, int rva)
    {
        foreach (var section in sections)
        {
            var start = section.VirtualAddress;
            var span = Math.Max(section.VirtualSize, section.SizeOfRawData);
            if (rva >= start && (long)rva < (long)start + span)
            {
                var rawOffset = (long)section.PointerToRawData + (rva - start);
                return rawOffset >= 0 && rawOffset <= int.MaxValue ? (int)rawOffset : -1;
            }
        }
        return -1;
    }

    private static string ReadAsciiZ(FileStream stream, int offset)
    {
        if (offset < 0 || offset >= stream.Length) return "";
        stream.Position = offset;
        var bytes = new List<byte>();
        while (bytes.Count < MaxNameBytes && stream.Position < stream.Length)
        {
            var value = stream.ReadByte();
            if (value <= 0) break;
            bytes.Add((byte)value);
        }
        return Encoding.ASCII.GetString(bytes.ToArray());
    }
}
