#!/bin/sh

d=`date "+%d"`
t=28

a=0
b=10

while [ $a -lt $b ]
do
  i=`expr \( $a + $d \) % $t + 1`
  node .dist/jiadejin.js list_1_$i.html
  a=`expr $a + 1`
done
