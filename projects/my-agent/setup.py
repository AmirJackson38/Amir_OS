from setuptools import setup, find_packages

setup(
    name="myagent",
    version="1.0.0",
    description="Lightweight terminal AI client for OmniRoute",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    entry_points={
        "console_scripts": [
            "myagent=myagent.cli:main",
        ],
    },
    python_requires=">=3.10",
    install_requires=[
        "rich>=13.0",
        "httpx>=0.27",
    ],
)
