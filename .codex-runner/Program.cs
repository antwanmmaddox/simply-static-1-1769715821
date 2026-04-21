using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:8080");

var app = builder.Build();
var siteRoot = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, ".."));
var fileProvider = new PhysicalFileProvider(siteRoot);

app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = fileProvider
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = fileProvider
});

app.MapFallback(async context =>
{
    var indexPath = Path.Combine(siteRoot, "index.html");
    context.Response.ContentType = "text/html; charset=utf-8";
    await context.Response.SendFileAsync(indexPath);
});

app.Run();
