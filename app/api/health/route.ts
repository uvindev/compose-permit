/**
 * @project  ComposePermit — github.com/uvindev/compose-permit
 * @author   Uvin Vindula (IAMUVIN)
 * @website  https://iamuvin.com
 * @license  MIT
 */

export function GET() {
  return Response.json({
    status: "ok",
    composeStorage: false,
    dockerExecution: false,
    interpolation: false,
    registryAccess: false,
    license: "MIT",
  });
}
