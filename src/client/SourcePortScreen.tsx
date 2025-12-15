import { AnimatePresence, motion } from "motion/react";
import { type ReactElement, useEffect, useState } from "react";
import styles from "./SourcePortScreen.module.css";

const slideVariants = {
	initial: {
		x: "100%",
		opacity: 0,
	},
	animate: {
		x: 0,
		opacity: 1,
		transition: { duration: 0.5, ease: "easeInOut" as const }, // <--- FIX
	},
	exit: {
		x: "-100%",
		opacity: 0,
		transition: { duration: 0.5, ease: "easeInOut" as const }, // <--- FIX
	},
};

/**
 * New component
 *
 */
function SourcePortScreen() {
	const [step, setStep] = useState<1 | 2 | 3>(1);

	let grid: ReactElement;
	let title: string;
	switch (step) {
		case 1: {
			const handleDownloadFinished = () => {
				setStep(2);
			};
			title = "Select Source Port";
			grid = (
				<SourcePortSelector
					key="step1"
					onDownloadFinished={handleDownloadFinished}
				/>
			);
			break;
		}
		case 2: {
			title = "Select Source Port";
			grid = <IWadSelector key="step2" />;
			break;
		}
	}
	// bg-[url('sky.png')] bg-cover bg-bottom
	return (
		<div className={"flex flex-col w-full"}>
			<div className={"flex flex-col w-full h-full"}>
				<header
					className={"bg-black px-4 py-4 flex flex-row gap-8 items-baseline"}
				>
					<h2 className={"text-2xl px-4"}>{title}</h2>
				</header>

				<div className="relative flex-1 h-full w-full overflow-hidden ">
					<div className="absolute inset-x-0 bottom-0 h-full overflow-hidden">
						<div className={styles.scrollingBg} />
					</div>
					<AnimatePresence>{grid}</AnimatePresence>
				</div>
			</div>
		</div>
	);
}

export default SourcePortScreen;

type ScreenProps = {
	onDownloadFinished?: () => void;
	onDownload?: () => void;
};

function SourcePortSelector({ onDownloadFinished }: ScreenProps) {
	const [percentage, setPercentage] = useState(0);
	const handleDownloadSourcePort = async () => {
		console.log("handleDownloadSourcePort");
		try {
			await window.electron.handleDownload({
				url: "https://github.com/UZDoom/UZDoom/releases/download/4.14.3/macOS-UZDoom-4.14.3.zip",
			});
			onDownloadFinished();
		} catch (error) {
			console.error("Download failed:", error);
		}
	};

	useEffect(() => {
		// Set up progress listener
		const unsubscribeProgress = window.electron.onDownload(({ percentage }) => {
			console.log("Progress update:", percentage);
			setPercentage(Number(percentage));
		});

		// Clean up listeners
		return () => {
			unsubscribeProgress();
		};
	}, []);

	return (
		<motion.div
			variants={slideVariants} // Use the variants
			initial="initial" // Set initial state
			animate="animate" // Set animate state
			exit="exit" // Set exit state
			className={
				"absolute inset-0 grid w-full p-4 h-full gap-4 items-start grid-cols-3"
			}
		>
			<ContentContainer
				header="Neo-classic"
				subheader="UZDoom"
				description="Modern experience with a full 3D look, featuring enhanced graphics and visuals. It also includes modern mods support for expanded gameplay possibilities."
				actions={
					<Button
						text={`${percentage !== 0 ? `Downloading [${percentage} %]` : "Install"}`}
						onClick={() => {
							console.log("clicked");
							handleDownloadSourcePort();
						}}
					/>
				}
			/>
			<ContentContainer
				header="Vanilla"
				subheader="Chocolate Doom"
				actions={<p>Not implemented</p>}
			/>
			<ContentContainer
				header="Other"
				subheader="Manual setup"
				actions={<p>Not implemented</p>}
			/>
		</motion.div>
	);
}
function IWadSelector() {
	return (
		<motion.div
			variants={slideVariants} // Use the variants
			initial="initial" // Set initial state
			animate="animate" // Set animate state
			exit="exit" // Set exit state
			className={
				"absolute inset-0 grid w-full p-4 h-full gap-4 items-start grid-cols-3"
			}
		>
			<ContentContainer
				header="Open-source"
				subheader="Freedoom"
				description="Free alternative version of doom.
While having a distinct visuals and levels, provides the same gameplay mechanics "
				actions={<Button text="Install" />}
			/>
			<ContentContainer
				header="Other"
				subheader="Original doom or other games"
				actions={<p>Not implemented</p>}
			/>
		</motion.div>
	);
}

type ButtonProps = {
	text: string;
	type?: "secondary" | "primary";
	onClick?: () => void;
	disabled?: boolean;
};

function Button({
	text,
	type = "primary",
	onClick,
	disabled = false,
}: ButtonProps) {
	return (
		<button
			disabled={disabled}
			className={`py-1 px-3 ${type === "primary" ? "bg-white text-black" : ""} 
      hover:scale-105 active:scale-105
      `}
			type={"button"}
			onClick={onClick}
		>
			{text}
		</button>
	);
}

type ContentContainerProps = {
	header: string;
	description?: string;
	actions?: React.ReactElement;
	subheader?: string;
};

function ContentContainer({
	actions,
	description,
	header,
	subheader,
}: ContentContainerProps) {
	return (
		<article
			tabIndex={-1}
			className="focus:outline-white focus:outline-2 flex flex-col gap-4 p-6 bg-black"
		>
			<header>
				<h3
					className={"text-lg text-shadow-lg/70 font-bold"}
					style={{ fontFamily: "PressStart2P" }}
				>
					{header}
				</h3>
				{subheader && <p className={"text-xl"}>{subheader}</p>}
			</header>
			{actions}
			{description && <p>{description}</p>}
		</article>
	);
}
