import { useEffect, useState } from "react";

/**
 * New component
 *
 */
function SourcePortScreen() {
	return (
		<div className={"flex flex-col py-4 w-full h-full"}>
			<h2
				className={"text-sm m-auto text-red-800 h-fit"}
				style={{ fontFamily: "PressStart2P" }}
			>
				DoomDash
			</h2>
			<div className={"flex px-4 flex-col w-full h-full mb-4"}>
				<header className={"py-4 flex flex-row gap-8 items-baseline"}>
					<h2 className={"text-2xl"}>Select source port</h2>
				</header>
				<p></p>
				<div className={"flex w-full gap-4 flex-col"}>
					<article
						className={
							"w-full bg-white/4 p-4 flex flex-col gap-4 border-8 border-transparent hover:bg-white/10 hover:border-red-900/50 hover:shadow-lg/30 "
						}
					>
						<h3
							className={"text-2xl text-shadow-lg/70 font-bold"}
							style={{ fontFamily: "PressStart2P" }}
						>
							UZDoom
						</h3>
						<div>
							<p>For modern experience</p>
							<ul>
								<li>Full 3D look</li>
								<li>Modern Mods</li>
								<li>Enhanced graphics</li>
							</ul>
						</div>
						<Loader />
					</article>
					<article
						className={
							"w-full bg-white/4 p-4 flex flex-col gap-4 border-8 border-transparent hover:bg-white/10 hover:border-red-900/50 hover:shadow-lg/30 "
						}
					>
						{" "}
						<h3 className={"text-2xl font-bold"}>Select manually</h3>
						<div>
							<p>Under development</p>
						</div>
					</article>
				</div>
			</div>
		</div>
	);
}

export default SourcePortScreen;

function Loader() {
	const [progress, setProgress] = useState({
		percentage: "0",
		filename: null,
	});

	useEffect(() => {
		// Set up progress listener
		const unsubscribeProgress = window.electron.onDownload(
			({ percentage, filename }) => {
				setProgress({
					percentage: String(percentage),
					filename,
				});
			},
		);

		// Clean up listeners
		return () => {
			unsubscribeProgress();
		};
	}, []);

	return (
		<div>
			progress: {progress.filename}: {progress.percentage}
		</div>
	);
}
