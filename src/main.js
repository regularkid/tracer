var ctx = document.getElementById("canvas").getContext('2d');
var framebuffer = new Framebuffer(ctx, ctx.canvas.width, ctx.canvas.height);

var matRed = new Material(new Vec3(0.2, 0.0, 0.0), new Vec3(1.0, 0.0, 0.0), new Vec3(1.0, 1.0, 1.0), 30.0);
var matGreen = new Material(new Vec3(0.0, 0.2, 0.0), new Vec3(0.0, 1.0, 0.0), new Vec3(1.0, 1.0, 1.0), 10.0, 0.5);
var matBlue = new Material(new Vec3(0.0, 0.0, 0.2), new Vec3(0.0, 0.0, 1.0), new Vec3(1.0, 1.0, 1.0), 50.0);
var matYellow = new Material(new Vec3(0.2, 0.2, 0.0), new Vec3(1.0, 1.0, 0.0), new Vec3(1.0, 1.0, 1.0), 30.0);
var matBlack = new Material(new Vec3(0.0, 0.0, 0.0), new Vec3(0.3, 0.3, 0.3), new Vec3(1.0, 1.0, 1.0), 50.0, 0.25);
var matWhite = new Material(new Vec3(0.2, 0.2, 0.2), new Vec3(0.7, 0.7, 0.7), new Vec3(1.0, 1.0, 1.0), 10.0, 0.5);

var objects = new Array();
objects.push(new Sphere(new Vec3(0.0, -3.0, -15.0), 5.0, matRed));
objects.push(new Sphere(new Vec3(6.0, 3.0, -17.0), 4.0, matBlack));
objects.push(new Sphere(new Vec3(-4.0, 2.0, -20.0), 4.0, matBlue));
objects.push(new Sphere(new Vec3(0.0, -100.0, 15.0), 100.0, matWhite));

var lights = new Array();
lights.push(new Light(new Vec3(-5.0, 0.0, -7.0), 0.5));
lights.push(new Light(new Vec3(15.0, 15.0, -5.0), 0.5));

var backgroundColor = new Vec3(0.2, 0.2, 0.2);

var curAngle = 0;
function Render()
{
    let start = Date.now();
    let color = new Vec3();
    let samplesPerPixel = 1;

    // TEMP!
    // curAngle = (Date.now() * 0.0005) % 6.28;
    // lights[0].position.x = Math.cos(curAngle)*25.0;
    // lights[0].position.z = -15 + Math.sin(curAngle)*25.0;

    for (var y = 0; y < ctx.canvas.height; y++)
    {
        for (var x = 0; x < ctx.canvas.width; x++)
        {
            let colorSum = new Vec3(0, 0, 0);
            for (var s = 0; s < samplesPerPixel; s++)
            {
                let dir = new Vec3(-2.0 + ((x + Math.random()) / ctx.canvas.width)*4.0, 1.0 - ((y + Math.random()) / ctx.canvas.height)*2.0, -1.0);
                dir.Normalize();

                CastRay(new Vec3(0, 0, 0), dir, color, 1);
                colorSum.Add(color);
            }

            colorSum.Scale(1.0/samplesPerPixel);

            framebuffer.drawPixel(x, y, colorSum);
        }
    }

    framebuffer.drawToContext(ctx);

    let elapsed = Date.now() - start;
    console.log(elapsed);
}

function CastRay(origin, dir, color, depth)
{
    let hitMaterial = new Material();
    let hitPosition = new Vec3();
    let hitNormal = new Vec3();

    // Nothing hit - just render the background color
    if (!GetSceneIntersection(origin, dir, hitPosition, hitNormal, hitMaterial))
    {
        color.Set(backgroundColor.x, backgroundColor.y, backgroundColor.y);
        return false;
    }

    // Calculate diffuse/spec intensities
    let diffuseIntensity = 0.0;
    let specIntensity = 0.0;
    for (var i = 0; i < lights.length; i++)
    {
        let toLight = lights[i].position.GetCopy();
        toLight.Sub(hitPosition);
        toLight.Normalize();

        // Any other objects blocking our view of the light? If so, don't include this light source (ie., shadows)
        if (depth > 0)
        {
            let shadowTestStart = hitNormal.GetCopy();
            shadowTestStart.Scale(0.001);
            shadowTestStart.Add(hitPosition);
            if (GetSceneIntersection(shadowTestStart, toLight))
            {
                continue;
            }
        }

        diffuseIntensity += Math.max(0.0, toLight.Dot(hitNormal) * lights[i].intensity);

        let reflectedDirInv = toLight.GetReflected(hitNormal);
        reflectedDirInv.Invert();
        specIntensity += Math.pow(Math.max(0.0, reflectedDirInv.Dot(dir)), hitMaterial.specExponent) * lights[i].intensity;
    }
    
    // Phong = ambient + diffuse + spec
    let ambient = hitMaterial.ambient.GetCopy();

    let diffuse = hitMaterial.diffuse.GetCopy();
    diffuse.Scale(diffuseIntensity);

    let spec = hitMaterial.spec.GetCopy();
    spec.Scale(specIntensity);

    color.Set(ambient.x+diffuse.x+spec.x, ambient.y+diffuse.y+spec.y, ambient.z+diffuse.z+spec.z);

    // Get reflected color
    if (hitMaterial.reflectionMultiplier > 0.0 && depth > 0)
    {
        let reflectedColor = new Vec3();
        let reflectedDir = dir.GetReflected(hitNormal);
        reflectedDir.Invert();
        let reflectOrigin = hitNormal.GetCopy();
        reflectOrigin.Scale(0.001);
        reflectOrigin.Add(hitPosition);
        CastRay(reflectOrigin, reflectedDir, reflectedColor, depth - 1);

        reflectedColor.Scale(hitMaterial.reflectionMultiplier);
        color.Add(reflectedColor);
    }

    return true;
}

function GetSceneIntersection(origin, dir, hitPosition, hitNormal, hitMaterial)
{
    for (var i = 0; i < objects.length; i++)
    {
        // Assume sphere are sorted by depth to make this simpler
        if (objects[i].Intersects(origin, dir, hitPosition, hitNormal, hitMaterial))
        {
            return true;
        }
    }

    return false;
}

//setInterval(Render, 16);
Render();

function SetCanvasSize()
{
    let canvas = document.getElementById("canvas");
    let size = parseInt(document.getElementById("sizeSelect").value);
    canvas.width = size;
    canvas.height = size;
    //canvas.style.width = `${size}px`;
    //canvas.style.height = `${size}px`;
}