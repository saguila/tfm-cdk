FROM amazon/aws-glue-libs:glue_libs_1.0.0_image_01
RUN pip3 install spark_privacy_preserver==0.3.1 pyspark==2.4.5 pyarrow==0.17.1 diffprivlib==0.2.1 mypy==0.770 tabulate==0.8.7
RUN pip3 install faker

# pandas 1.1.5 has requirement numpy>=1.15.4, but you'll have numpy 1.15.0 which is incompatible.
# spark-privacy-preserver 0.3.1 has requirement pyarrow==0.17.1, but you'll have pyarrow 4.0.1 which is incompatible.
# spark-privacy-preserver 0.3.1 has requirement pyspark==2.4.5, but you'll have pyspark 2.4.3 which is incompatible.